import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { recalcularPedido } from '@/lib/pedidos-utils'
import {
  notificarPedidoAceptado,
  notificarPedidoRechazado,
  notificarPedidoListo,
  notificarPedidoEnCamino,
  notificarPedidoEntregado,
  notificarPedidoCancelado,
} from '@/lib/firebase/notificaciones-pedido'
const estadoSchema = z.object({
  estado: z.enum([
    'PENDIENTE',
    'ACEPTADO',
    'PREPARANDO',
    'LISTO',
    'ASIGNADO',
    'EN_CAMINO',
    'ENTREGADO',
    'RECHAZADO',
    'CANCELADO',
  ]),
  notas: z.string().max(500).optional().nullable(),
  tiempo_estimado: z.number().int().min(1).max(180).optional(),
}).superRefine((data, ctx) => {
  if (data.estado === 'ACEPTADO' && data.tiempo_estimado === undefined) {
    ctx.addIssue({ code: 'custom', message: 'Indica el tiempo estimado de preparación', path: ['tiempo_estimado'] })
  }
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = estadoSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { estado, notas, tiempo_estimado } = parsed.data

    // Verificar que existe + obtener pedido_id
    const exists = await sql`
      SELECT id, pedido_id, estado, entrega_reportada_en FROM sub_pedidos WHERE id = ${id} LIMIT 1
    `
    if (exists.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    const pedidoId = exists[0].pedido_id
    const transiciones: Record<string, string[]> = {
      PENDIENTE: ['ACEPTADO', 'RECHAZADO', 'CANCELADO'],
      ACEPTADO: ['LISTO', 'CANCELADO'],
      PREPARANDO: ['LISTO', 'CANCELADO'],
      LISTO: ['EN_CAMINO', 'CANCELADO'],
      ASIGNADO: ['EN_CAMINO', 'CANCELADO'],
      EN_CAMINO: ['CANCELADO'],
      EN_CLIENTE: ['CANCELADO'],
      ENTREGA_PENDIENTE_CONFIRMACION: ['ENTREGADO', 'CANCELADO'],
    }
    if (!transiciones[exists[0].estado]?.includes(estado)) {
      return Response.json({ ok: false, error: `No se puede cambiar de ${exists[0].estado} a ${estado}.` }, { status: 409 })
    }

    if (estado === 'ENTREGADO' && !exists[0].entrega_reportada_en) {
      return Response.json(
        { ok: false, error: 'Solo puedes liberar el pedido después de que el driver reporte la entrega.' },
        { status: 409 }
      )
    }

    const now = new Date()

    // Aplicar el cambio solo si el pedido sigue en el estado que validamos arriba.
    let cambioAplicado: any[] | null = null
    switch (estado) {
      case 'ACEPTADO':
        cambioAplicado = await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, aceptado_en = ${now}, tiempo_estimado = ${tiempo_estimado}
          WHERE id = ${id} AND estado = ${exists[0].estado}
          RETURNING id
        `
        break
      case 'LISTO':
        cambioAplicado = await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, listo_en = ${now}
          WHERE id = ${id} AND estado = ${exists[0].estado}
          RETURNING id
        `
        break
      case 'EN_CAMINO':
        cambioAplicado = await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, recogido_en = ${now}
          WHERE id = ${id} AND estado = ${exists[0].estado}
          RETURNING id
        `
        break
      case 'ENTREGADO':
        await sql`
          SELECT confirmar_entrega_subpedido(
            ${id}::uuid, ${user.id}::uuid, 'ADMIN',
            ${notas || 'Cierre manual por administrador'}
          )
        `
        break
      default:
        cambioAplicado = await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}
          WHERE id = ${id} AND estado = ${exists[0].estado}
          RETURNING id
        `
    }    // 🔔 Notificar al cliente
    if (cambioAplicado && cambioAplicado.length === 0) {
      return Response.json({ ok: false, error: 'El pedido cambió de estado. Actualiza la vista e inténtalo de nuevo.' }, { status: 409 })
    }
    try {
      // Traer usuario y restaurante
      const info = (await sql`
        SELECT 
          sp.pedido_id,
          p.usuario_id,
          r.nombre as restaurante_nombre,
          sp.tiempo_estimado,
          u.nombre as driver_nombre
        FROM sub_pedidos sp
        INNER JOIN pedidos p ON p.id = sp.pedido_id
        INNER JOIN restaurantes r ON r.id = sp.restaurante_id
        LEFT JOIN usuarios u ON u.id = sp.driver_id
        WHERE sp.id = ${id}
        LIMIT 1
      `) as any[]

      if (info.length > 0) {
        const row = info[0]
        const usuarioId = row.usuario_id

        switch (estado) {
          case 'ACEPTADO':
            await notificarPedidoAceptado(
              usuarioId,
              row.restaurante_nombre,
              row.tiempo_estimado
            )
            break
          case 'RECHAZADO':
            await notificarPedidoRechazado(
              usuarioId,
              row.restaurante_nombre,
              notas || null
            )
            break
          case 'LISTO':
            await notificarPedidoListo(usuarioId, row.restaurante_nombre)
            break
          case 'EN_CAMINO':
            await notificarPedidoEnCamino(
              usuarioId,
              row.restaurante_nombre,
              row.driver_nombre
            )
            break
          case 'ENTREGADO':
            await notificarPedidoEntregado(usuarioId, row.restaurante_nombre)
            break
          case 'CANCELADO':
            await notificarPedidoCancelado(usuarioId, row.restaurante_nombre)
            break
        }
      }
    } catch (notifErr) {
      // No fallar el cambio de estado si la notificación falla
      console.error('Error enviando notificación:', notifErr)
    }

    // Registrar en historial
    if (estado !== 'ENTREGADO') {
      await sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
        VALUES (${id}, ${estado}, ${user.id}, ${notas || null})
      `
    }

    // 🔄 RECALCULAR PEDIDO PADRE
    await recalcularPedido(pedidoId)

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH estado error:', error)
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Solo se puede liberar')) {
      return Response.json({ ok: false, error: message }, { status: 409 })
    }
    return Response.json(
      { ok: false, error: 'Error al cambiar estado' },
      { status: 500 }
    )
  }
}

import { z } from 'zod'
import { getDriverSession } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { notifyInternalPush } from '@/lib/push/internal'

const schema = z.object({ accion: z.enum(['LLEGUE', 'RECOGI', 'ENTREGUE']) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const driver = await getDriverSession()
  if (!driver) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'Pedido inválido' }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Acción inválida' }, { status: 400 })

  try {
    const sql = getSql()
    const { accion } = parsed.data
    let updated: any[]
    let state: string
    let historyWritten = false
    if (accion === 'LLEGUE') {
      updated = await sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
        SELECT sp.id, 'ASIGNADO', ${driver.id}, 'LLEGUE'
        FROM sub_pedidos sp
        WHERE sp.id = ${id} AND sp.driver_id = ${driver.id} AND sp.estado IN ('LISTO', 'ASIGNADO')
          AND NOT EXISTS (
            SELECT 1 FROM pedido_estado_historial h
            WHERE h.sub_pedido_id = sp.id AND h.cambiado_por = ${driver.id} AND h.notas = 'LLEGUE'
          )
        RETURNING sub_pedido_id AS id
      ` as any[]
      state = 'ASIGNADO'
      historyWritten = true
      if (updated.length) await sql`UPDATE sub_pedidos SET estado = 'ASIGNADO' WHERE id = ${id} AND driver_id = ${driver.id} AND estado = 'LISTO'`
    } else if (accion === 'RECOGI') {
      updated = await sql`
        UPDATE sub_pedidos sp SET estado = 'EN_CAMINO', recogido_en = NOW()
        WHERE sp.id = ${id} AND sp.driver_id = ${driver.id} AND sp.estado = 'ASIGNADO'
          AND EXISTS (
            SELECT 1 FROM pedido_estado_historial h
            WHERE h.sub_pedido_id = sp.id AND h.cambiado_por = ${driver.id} AND h.notas = 'LLEGUE'
          )
        RETURNING sp.id
      ` as any[]
      state = 'EN_CAMINO'
    } else {
      updated = await sql`UPDATE sub_pedidos SET estado = 'ENTREGA_PENDIENTE_CONFIRMACION', entrega_reportada_en = NOW() WHERE id = ${id} AND driver_id = ${driver.id} AND estado = 'EN_CAMINO' AND recogido_en IS NOT NULL RETURNING id` as any[]
      state = 'ENTREGA_PENDIENTE_CONFIRMACION'
    }
    if (!updated.length) return Response.json({ ok: false, error: 'La acción no corresponde al estado actual del pedido.' }, { status: 409 })
    if (!historyWritten) await sql`INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas) VALUES (${id}, ${state}, ${driver.id}, ${accion})`
    if (accion === 'RECOGI') await notifyInternalPush('DRIVER_ON_THE_WAY', id)
    if (accion === 'ENTREGUE') await notifyInternalPush('DRIVER_ARRIVED', id)
    if (accion === 'ENTREGUE') await sql`
      UPDATE driver_detalles SET disponible = TRUE, actualizado_en = NOW() WHERE usuario_id = ${driver.id}
        AND NOT EXISTS (SELECT 1 FROM sub_pedidos WHERE driver_id = ${driver.id}
          AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO'))
    `
    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH driver/orders/action error:', error)
    return Response.json({ ok: false, error: 'No se pudo actualizar el pedido' }, { status: 500 })
  }
}

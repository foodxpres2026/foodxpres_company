import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getDriver, localCorsHeaders, localCorsJson } from '@/lib/local-auth'

const schema = z.object({ accion: z.enum(['LLEGUE', 'RECOGI', 'LLEGUE_CLIENTE', 'ENTREGUE']) })

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const driver = await getDriver(req)
  if (!driver) return localCorsJson(req, { ok: false, error: 'No autorizado' }, { status: 401 }, 'PATCH, OPTIONS')

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return localCorsJson(req, { ok: false, error: 'Acción inválida' }, { status: 400 }, 'PATCH, OPTIONS')
    const { id } = await params
    let updated: any[] = []
    let estadoHistorial = ''

    if (parsed.data.accion === 'LLEGUE') {
      updated = (await sql`
        UPDATE sub_pedidos SET driver_llego_en = NOW()
        WHERE id = ${id} AND driver_id = ${driver.id}
          AND estado = 'ASIGNADO' AND driver_llego_en IS NULL
        RETURNING id
      `) as any[]
      estadoHistorial = 'ASIGNADO'
    } else if (parsed.data.accion === 'RECOGI') {
      updated = (await sql`
        UPDATE sub_pedidos SET estado = 'EN_CAMINO', recogido_en = NOW()
        WHERE id = ${id} AND driver_id = ${driver.id}
          AND estado = 'ASIGNADO' AND driver_llego_en IS NOT NULL
        RETURNING id
      `) as any[]
      estadoHistorial = 'EN_CAMINO'
    } else if (parsed.data.accion === 'LLEGUE_CLIENTE') {
      updated = (await sql`
        UPDATE sub_pedidos SET estado = 'EN_CLIENTE', driver_llego_cliente_en = NOW()
        WHERE id = ${id} AND driver_id = ${driver.id}
          AND estado = 'EN_CAMINO' AND recogido_en IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM pedido_estado_historial h
            WHERE h.sub_pedido_id = ${id} AND h.cambiado_por = ${driver.id} AND h.notas = 'LLEGUE_CLIENTE')
        RETURNING id
      `) as any[]
      estadoHistorial = 'EN_CLIENTE'
    } else {
      updated = (await sql`SELECT confirmar_entrega_subpedido(${id}::uuid, ${driver.id}::uuid, 'DRIVER', NULL) AS id`) as any[]
      estadoHistorial = 'ENTREGA_PENDIENTE_CONFIRMACION'
    }

    if (updated.length === 0) {
      return localCorsJson(req, { ok: false, error: 'La acción no corresponde al estado actual del pedido' }, { status: 409 }, 'PATCH, OPTIONS')
    }

    if (parsed.data.accion === 'ENTREGUE') {
      const current = await sql`SELECT estado FROM sub_pedidos WHERE id = ${id} AND driver_id = ${driver.id} LIMIT 1` as { estado: string }[]
      if (current[0]?.estado === 'ENTREGADO') return localCorsJson(req, { ok: true }, {}, 'PATCH, OPTIONS')
    }

    if (parsed.data.accion !== 'ENTREGUE') await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, ${estadoHistorial}, ${driver.id}, ${parsed.data.accion})
    `
    if (parsed.data.accion === 'ENTREGUE') {
      await sql`
        UPDATE driver_detalles SET disponible = TRUE, actualizado_en = NOW()
        WHERE usuario_id = ${driver.id} AND NOT EXISTS (
          SELECT 1 FROM sub_pedidos WHERE driver_id = ${driver.id}
            AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO', 'EN_CLIENTE', 'ENTREGA_PENDIENTE_CONFIRMACION')
        )
      `
    }
    return localCorsJson(req, { ok: true }, {}, 'PATCH, OPTIONS')
  } catch (error) {
    console.error('Acción driver error:', error)
    return localCorsJson(req, { ok: false, error: 'No se pudo actualizar el pedido' }, { status: 500 }, 'PATCH, OPTIONS')
  }
}

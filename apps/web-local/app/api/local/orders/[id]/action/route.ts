import { z } from 'zod'
import { getLocalSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

const schema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('ACEPTAR'), tiempo_estimado: z.coerce.number().int().min(1).max(180) }),
  z.object({ accion: z.literal('RECHAZAR'), motivo: z.string().trim().max(200).optional().nullable() }),
  z.object({ accion: z.literal('LISTO') }),
])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'Pedido inválido' }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'La acción o sus datos no son válidos.' }, { status: 400 })

  try {
    const sql = getSql()
    const { accion } = parsed.data
    let updated: any[]
    let state: string
    let note: string
    if (accion === 'ACEPTAR') {
      updated = await sql`
        UPDATE sub_pedidos SET estado = 'ACEPTADO', tiempo_estimado = ${parsed.data.tiempo_estimado}, aceptado_en = NOW()
        WHERE id = ${id} AND restaurante_id = ${staff.restauranteId} AND estado = 'PENDIENTE'
        RETURNING id
      ` as any[]
      state = 'ACEPTADO'; note = 'Aceptado por el local'
    } else if (accion === 'RECHAZAR') {
      const motivo = parsed.data.motivo || null
      updated = await sql`
        UPDATE sub_pedidos SET estado = 'RECHAZADO', motivo_rechazo = ${motivo}
        WHERE id = ${id} AND restaurante_id = ${staff.restauranteId} AND estado = 'PENDIENTE'
        RETURNING id
      ` as any[]
      state = 'RECHAZADO'; note = motivo || 'Rechazado por el local'
    } else {
      updated = await sql`
        UPDATE sub_pedidos SET estado = 'LISTO', listo_en = NOW()
        WHERE id = ${id} AND restaurante_id = ${staff.restauranteId} AND estado IN ('ACEPTADO', 'PREPARANDO')
        RETURNING id
      ` as any[]
      state = 'LISTO'; note = 'Pedido listo para recojo'
    }
    if (!updated.length) return Response.json({ ok: false, error: 'El pedido ya cambió de estado o no pertenece a tu local.' }, { status: 409 })
    await sql`INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas) VALUES (${id}, ${state}, ${staff.id}, ${note})`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH local/orders/action error:', error)
    return Response.json({ ok: false, error: 'No se pudo actualizar el pedido.' }, { status: 500 })
  }
}

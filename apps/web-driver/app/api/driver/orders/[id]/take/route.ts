import { getDriverSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const driver = await getDriverSession()
  if (!driver) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'Pedido inválido' }, { status: 400 })

  try {
    const sql = getSql()
    const updated = await sql`SELECT tomar_pedido_driver(${id}::uuid, ${driver.id}::uuid, FALSE) AS estado` as { estado: string }[]
    if (!updated.length) return Response.json({ ok: false, error: 'No se pudo reservar el pedido.' }, { status: 409 })
    await sql`INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas) VALUES (${id}, ${updated[0].estado}, ${driver.id}, 'Pedido reservado por el driver')`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('POST driver/orders/take error:', error)
    if (error instanceof Error && /máximo de 2|ya tomado|desconectado|no disponible|deuda vencida|deuda pendiente/i.test(error.message)) return Response.json({ ok: false, error: error.message }, { status: 409 })
    return Response.json({ ok: false, error: 'No se pudo tomar el pedido' }, { status: 500 })
  }
}

import { getLocalSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'
const PAGE_LIMIT = 100

export async function GET() {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })

  try {
    const sql = getSql()
    const orders = await sql`
      SELECT sp.id, sp.estado, sp.subtotal, sp.costo_envio, sp.notas AS notas_local,
             sp.motivo_rechazo, sp.creado_en, sp.aceptado_en, sp.listo_en,
             sp.entregado_en, sp.direccion_snapshot,
             p.codigo AS pedido_codigo, p.total AS pedido_total, p.notas AS notas_pedido,
             u.nombre AS cliente_nombre, u.celular AS cliente_celular
      FROM sub_pedidos sp
      INNER JOIN pedidos p ON p.id = sp.pedido_id
      INNER JOIN usuarios u ON u.id = p.usuario_id
      WHERE sp.restaurante_id = ${staff.restauranteId}
        AND sp.estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO')
      ORDER BY CASE WHEN sp.estado = 'PENDIENTE' THEN 0 WHEN sp.estado IN ('ACEPTADO', 'PREPARANDO') THEN 1 WHEN sp.estado = 'LISTO' THEN 2 ELSE 3 END,
               sp.creado_en DESC
      LIMIT ${PAGE_LIMIT}
    ` as any[]

    const ids = orders.map((order) => order.id)
    const items = ids.length ? await sql`
      SELECT pi.id, pi.sub_pedido_id, pi.nombre_snapshot, pi.cantidad, pi.subtotal, pi.notas
      FROM pedido_items pi WHERE pi.sub_pedido_id = ANY(${ids}::uuid[])
      ORDER BY pi.creado_en, pi.id
    ` as any[] : []
    const grouped = new Map<string, any[]>()
    for (const item of items) grouped.set(item.sub_pedido_id, [...(grouped.get(item.sub_pedido_id) ?? []), item])

    return Response.json({
      ok: true,
      data: orders.map((order) => ({ ...order, items: grouped.get(order.id) ?? [] })),
      restaurante: { id: staff.restauranteId, nombre: staff.restauranteNombre },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET local/orders error:', error)
    return Response.json({ ok: false, error: 'No se pudieron cargar los pedidos del local.' }, { status: 500 })
  }
}

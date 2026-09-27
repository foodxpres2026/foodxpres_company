import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getDriver, localCorsHeaders, localCorsJson } from '@/lib/local-auth'

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'GET, OPTIONS') })
}

export async function GET(req: NextRequest) {
  const driver = await getDriver(req)
  if (!driver) return localCorsJson(req, { ok: false, error: 'No autorizado' }, { status: 401 })

  try {
    const rows = (await sql`
      SELECT sp.id, sp.driver_id, sp.estado, sp.subtotal, sp.costo_envio, sp.distancia_km,
             sp.tiempo_estimado, sp.direccion_snapshot, sp.creado_en,
             sp.driver_asignado_en, sp.driver_llego_en, sp.aceptado_en,
             sp.listo_en, sp.recogido_en, sp.entregado_en,
             p.codigo AS pedido_codigo, p.notas AS pedido_notas,
             r.nombre AS restaurante_nombre, r.direccion_fisica AS restaurante_direccion,
             r.celular AS restaurante_celular,
             u.nombre AS cliente_nombre, u.celular AS cliente_celular
      FROM sub_pedidos sp
      INNER JOIN pedidos p ON p.id = sp.pedido_id
      INNER JOIN restaurantes r ON r.id = sp.restaurante_id
      INNER JOIN usuarios u ON u.id = p.usuario_id
      WHERE (sp.estado = 'LISTO' AND sp.driver_id IS NULL)
         OR (sp.driver_id = ${driver.id})
      ORDER BY CASE WHEN sp.driver_id = ${driver.id} THEN 0 ELSE 1 END,
               sp.creado_en DESC
      LIMIT 100
    `) as any[]

    const availability = (await sql`
      SELECT disponible FROM driver_detalles WHERE usuario_id = ${driver.id} LIMIT 1
    `) as { disponible: boolean }[]

    const pedidoIds = rows.map((pedido) => pedido.id)
    const items = pedidoIds.length
      ? (await sql`
          SELECT pi.sub_pedido_id, pi.id, pi.nombre_snapshot, pi.cantidad, pi.subtotal, pi.notas
          FROM pedido_items pi
          WHERE pi.sub_pedido_id = ANY(${pedidoIds}::uuid[])
          ORDER BY pi.creado_en
        `) as any[]
      : []
    const itemsPorPedido = new Map<string, any[]>()
    for (const item of items) {
      const lista = itemsPorPedido.get(item.sub_pedido_id) ?? []
      lista.push(item)
      itemsPorPedido.set(item.sub_pedido_id, lista)
    }

    return localCorsJson(req, {
      ok: true,
      disponible: availability[0]?.disponible ?? false,
      data: rows.map((pedido) => ({ ...pedido, items: itemsPorPedido.get(pedido.id) ?? [] })),
    })
  } catch (error) {
    console.error('GET pedidos-driver error:', error)
    return localCorsJson(req, { ok: false, error: 'No se pudieron cargar los pedidos' }, { status: 500 })
  }
}

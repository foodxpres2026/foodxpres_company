import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const restauranteId = searchParams.get('restaurante_id')

    const rows = restauranteId
      ? await sql`
          SELECT 
            sp.id,
            sp.estado,
            sp.subtotal,
            sp.costo_envio,
            sp.distancia_km,
            sp.tiempo_estimado,
            sp.notas,
            sp.creado_en,
            sp.aceptado_en,
            sp.entregado_en,
            sp.direccion_snapshot,
            sp.pedido_id,
            p.codigo as pedido_codigo,
            p.propina,
            p.vip,
            p.costo_vip,
            p.total,
            u.nombre as cliente_nombre,
            u.celular as cliente_celular,
            r.id as restaurante_id,
            r.nombre as restaurante_nombre,
            d.id as driver_id,
            d.nombre as driver_nombre
          FROM sub_pedidos sp
          INNER JOIN pedidos p ON p.id = sp.pedido_id
          INNER JOIN usuarios u ON u.id = p.usuario_id
          INNER JOIN restaurantes r ON r.id = sp.restaurante_id
          LEFT JOIN usuarios d ON d.id = sp.driver_id
          WHERE sp.restaurante_id = ${restauranteId}
          ORDER BY sp.creado_en DESC
          LIMIT 200
        `
      : await sql`
          SELECT 
            sp.id,
            sp.estado,
            sp.subtotal,
            sp.costo_envio,
            sp.distancia_km,
            sp.tiempo_estimado,
            sp.notas,
            sp.creado_en,
            sp.aceptado_en,
            sp.entregado_en,
            sp.direccion_snapshot,
            sp.pedido_id,
            p.codigo as pedido_codigo,
            p.propina,
            p.vip,
            p.costo_vip,
            p.total,
            u.nombre as cliente_nombre,
            u.celular as cliente_celular,
            r.id as restaurante_id,
            r.nombre as restaurante_nombre,
            d.id as driver_id,
            d.nombre as driver_nombre
          FROM sub_pedidos sp
          INNER JOIN pedidos p ON p.id = sp.pedido_id
          INNER JOIN usuarios u ON u.id = p.usuario_id
          INNER JOIN restaurantes r ON r.id = sp.restaurante_id
          LEFT JOIN usuarios d ON d.id = sp.driver_id
          ORDER BY sp.creado_en DESC
          LIMIT 200
        `

    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET pedidos error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar pedidos' },
      { status: 500 }
    )
  }
}
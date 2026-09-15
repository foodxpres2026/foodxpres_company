import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const spRows = await sql`
      SELECT 
        sp.*,
        p.codigo as pedido_codigo,
        p.propina,
        p.vip,
        p.costo_vip,
        p.notas as pedido_notas,
        p.total as pedido_total,
        u.nombre as cliente_nombre,
        u.celular as cliente_celular,
        r.nombre as restaurante_nombre,
        r.celular as restaurante_celular,
        d.id as driver_id,
        d.nombre as driver_nombre,
        d.celular as driver_celular
      FROM sub_pedidos sp
      INNER JOIN pedidos p ON p.id = sp.pedido_id
      INNER JOIN usuarios u ON u.id = p.usuario_id
      INNER JOIN restaurantes r ON r.id = sp.restaurante_id
      LEFT JOIN usuarios d ON d.id = sp.driver_id
      WHERE sp.id = ${id}
      LIMIT 1
    `

    if (spRows.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    const items = await sql`
      SELECT 
        pi.id,
        pi.nombre_snapshot,
        pi.precio_snapshot,
        pi.cantidad,
        pi.subtotal,
        pi.notas
      FROM pedido_items pi
      WHERE pi.sub_pedido_id = ${id}
      ORDER BY pi.id
    `

    const itemsConOpciones = await Promise.all(
      items.map(async (item: any) => {
        const opciones = await sql`
          SELECT grupo_titulo_snapshot, choice_nombre_snapshot, precio_extra
          FROM item_opciones
          WHERE item_id = ${item.id}
        `
        return { ...item, opciones }
      })
    )

    const historial = await sql`
      SELECT 
        h.estado,
        h.notas,
        h.creado_en,
        u.nombre as cambiado_por_nombre
      FROM pedido_estado_historial h
      LEFT JOIN usuarios u ON u.id = h.cambiado_por
      WHERE h.sub_pedido_id = ${id}
      ORDER BY h.creado_en ASC
    `

    return Response.json({
      ok: true,
      data: {
        ...spRows[0],
        items: itemsConOpciones,
        historial,
      },
    })
  } catch (error) {
    console.error('GET pedido detalle error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener pedido' },
      { status: 500 }
    )
  }
}
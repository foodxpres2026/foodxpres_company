import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const pedidoRows = (await sql`
      SELECT 
        id, codigo, subtotal, total_envio, propina, vip, costo_vip,
        total, notas, estado_global, creado_en
      FROM pedidos
      WHERE id = ${id} AND usuario_id = ${user.id}
      LIMIT 1
    `) as any[]

    if (pedidoRows.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    const pedido = pedidoRows[0]

    const subs = (await sql`
      SELECT 
        sp.id, sp.estado, sp.subtotal, sp.costo_envio, sp.distancia_km,
        sp.direccion_snapshot, sp.notas, sp.creado_en,
        sp.aceptado_en, sp.listo_en, sp.recogido_en, sp.entregado_en,
        r.nombre as restaurante_nombre,
        r.celular as restaurante_celular,
        d.nombre as driver_nombre,
        d.celular as driver_celular
      FROM sub_pedidos sp
      INNER JOIN restaurantes r ON r.id = sp.restaurante_id
      LEFT JOIN usuarios d ON d.id = sp.driver_id
      WHERE sp.pedido_id = ${pedido.id}
      ORDER BY sp.creado_en ASC
    `) as any[]

    // Items por sub_pedido
    const subsConItems = await Promise.all(
      subs.map(async (sp: any) => {
        const items = (await sql`
          SELECT id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas
          FROM pedido_items
          WHERE sub_pedido_id = ${sp.id}
          ORDER BY id
        `) as any[]

        const itemsConOpciones = await Promise.all(
          items.map(async (item: any) => {
            const opciones = (await sql`
              SELECT grupo_titulo_snapshot, choice_nombre_snapshot, precio_extra
              FROM item_opciones
              WHERE item_id = ${item.id}
            `) as any[]
            return { ...item, opciones }
          })
        )

        return { ...sp, items: itemsConOpciones }
      })
    )

    return Response.json({
      ok: true,
      data: { ...pedido, sub_pedidos: subsConItems },
    })
  } catch (error) {
    console.error('GET pedido detalle error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener pedido' },
      { status: 500 }
    )
  }
}
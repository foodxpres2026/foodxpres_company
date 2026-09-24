import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params
    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha') // 'hoy' | 'ayer' | 'semana' | null

    // Construir filtro de fecha según parámetro
    let filtroFecha = sql``
    if (fecha === 'hoy') {
      filtroFecha = sql`AND sp.creado_en >= CURRENT_DATE`
    } else if (fecha === 'ayer') {
      filtroFecha = sql`
        AND sp.creado_en >= CURRENT_DATE - INTERVAL '1 day'
        AND sp.creado_en < CURRENT_DATE
      `
    } else if (fecha === 'semana') {
      filtroFecha = sql`AND sp.creado_en >= CURRENT_DATE - INTERVAL '7 days'`
    }

    const rows = (await sql`
      SELECT 
        sp.id,
        sp.estado,
        sp.subtotal,
        sp.costo_envio,
        sp.notas,
        sp.creado_en,
        sp.aceptado_en,
        sp.listo_en,
        sp.entregado_en,
        sp.direccion_snapshot,
        p.codigo as pedido_codigo,
        p.total as pedido_total,
        u.nombre as cliente_nombre,
        u.celular as cliente_celular
      FROM sub_pedidos sp
      INNER JOIN pedidos p ON p.id = sp.pedido_id
      INNER JOIN usuarios u ON u.id = p.usuario_id
      WHERE sp.restaurante_id = ${restaurantId}
        AND sp.estado IN (
          'PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO',
          'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO'
        )
        ${filtroFecha}
      ORDER BY sp.creado_en DESC
      LIMIT 100
    `) as any[]

    const pedidosConItems = await Promise.all(
      rows.map(async (sp) => {
        const items = (await sql`
          SELECT id, nombre_snapshot, cantidad, subtotal, notas
          FROM pedido_items
          WHERE sub_pedido_id = ${sp.id}
          ORDER BY id
        `) as any[]
        return { ...sp, items }
      })
    )

    return Response.json(
      { ok: true, data: pedidosConItems },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('GET pedidos local error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar' },
      { status: 500, headers: corsHeaders }
    )
  }
}
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

    // Traer sub-pedidos del local con items
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
        sp.direccion_snapshot,
        p.codigo as pedido_codigo,
        p.cliente_nombre,
        p.cliente_celular,
        p.total as pedido_total
      FROM sub_pedidos sp
      INNER JOIN pedidos p ON p.id = sp.pedido_id
      WHERE sp.restaurante_id = ${restaurantId}
        AND sp.estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO')
      ORDER BY sp.creado_en ASC
    `) as any[]

    // Traer items por cada pedido
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

    return Response.json({ ok: true, data: pedidosConItems }, { headers: corsHeaders })
  } catch (error) {
    console.error('GET pedidos local error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar' },
      { status: 500, headers: corsHeaders }
    )
  }
}
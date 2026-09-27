import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getLocalStaff, localCorsHeaders } from '@/lib/local-auth'

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'GET, OPTIONS') })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await getLocalStaff(req)
    if (!staff) {
      return Response.json({ ok: false, error: 'No autorizado' }, { status: 401, headers: localCorsHeaders(req, 'GET, OPTIONS') })
    }
    const { id: restaurantId } = await params
    if (staff.restaurantId !== restaurantId) {
      return Response.json({ ok: false, error: 'No autorizado para este restaurante' }, { status: 403, headers: localCorsHeaders(req, 'GET, OPTIONS') })
    }

    // Pedidos del día (entregados + rechazados + activos)
    const hoy = (await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN estado = 'ENTREGADO' THEN 1 END)::int as entregados,
        COUNT(CASE WHEN estado = 'RECHAZADO' THEN 1 END)::int as rechazados,
        COALESCE(SUM(CASE WHEN estado = 'ENTREGADO' THEN subtotal ELSE 0 END), 0)::numeric as ventas
      FROM sub_pedidos
      WHERE restaurante_id = ${restaurantId}
        AND creado_en >= CURRENT_DATE
    `) as any[]

    // Pedidos de ayer
    const ayer = (await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN estado = 'ENTREGADO' THEN 1 END)::int as entregados,
        COALESCE(SUM(CASE WHEN estado = 'ENTREGADO' THEN subtotal ELSE 0 END), 0)::numeric as ventas
      FROM sub_pedidos
      WHERE restaurante_id = ${restaurantId}
        AND creado_en >= CURRENT_DATE - INTERVAL '1 day'
        AND creado_en < CURRENT_DATE
    `) as any[]

    // Semana (últimos 7 días)
    const semana = (await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN estado = 'ENTREGADO' THEN 1 END)::int as entregados,
        COALESCE(SUM(CASE WHEN estado = 'ENTREGADO' THEN subtotal ELSE 0 END), 0)::numeric as ventas
      FROM sub_pedidos
      WHERE restaurante_id = ${restaurantId}
        AND creado_en >= CURRENT_DATE - INTERVAL '7 days'
    `) as any[]

    return Response.json(
      {
        ok: true,
        data: {
          hoy: hoy[0],
          ayer: ayer[0],
          semana: semana[0],
        },
      },
      { headers: localCorsHeaders(req, 'GET, OPTIONS') }
    )
  } catch (error) {
    console.error('GET estadisticas error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener estadísticas' },
      { status: 500, headers: localCorsHeaders(req, 'GET, OPTIONS') }
    )
  }
}

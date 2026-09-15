import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    // 1. Stats rápidas
    const [pedidosHoy, pedidosActivos, restaurantes, driversActivos, clientes] =
      await Promise.all([
        sql`SELECT COUNT(*)::int as total FROM pedidos WHERE creado_en >= CURRENT_DATE`,
        sql`
          SELECT COUNT(*)::int as total FROM sub_pedidos 
          WHERE estado IN ('PENDIENTE','ACEPTADO','PREPARANDO','LISTO','ASIGNADO','EN_CAMINO')
        `,
        sql`SELECT COUNT(*)::int as total FROM restaurantes WHERE activo = TRUE`,
        sql`SELECT COUNT(*)::int as total FROM usuarios WHERE role = 'DRIVER' AND activo = TRUE`,
        sql`SELECT COUNT(*)::int as total FROM usuarios WHERE role = 'CUSTOMER'`,
      ])

    const ingresosHoy = await sql`
      SELECT COALESCE(SUM(total), 0)::numeric as total 
      FROM pedidos WHERE creado_en >= CURRENT_DATE
    `

    // 2. Pedidos por día (últimos 7 días)
    const pedidosPorDia = await sql`
      SELECT 
        DATE(creado_en) as fecha,
        COUNT(*)::int as total,
        COALESCE(SUM(total), 0)::numeric as ingresos
      FROM pedidos
      WHERE creado_en >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(creado_en)
      ORDER BY fecha ASC
    `

    // 3. Pedidos por mes (últimos 6 meses)
    const pedidosPorMes = await sql`
      SELECT 
        TO_CHAR(creado_en, 'YYYY-MM') as mes,
        COUNT(*)::int as total,
        COALESCE(SUM(total), 0)::numeric as ingresos
      FROM pedidos
      WHERE creado_en >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY TO_CHAR(creado_en, 'YYYY-MM')
      ORDER BY mes ASC
    `

    // 4. Ranking de drivers (entregas por driver)
    const rankingDrivers = await sql`
      SELECT 
        u.id,
        u.nombre,
        u.celular,
        COUNT(sp.id)::int as total_entregas,
        (
          SELECT COUNT(*)::int FROM sub_pedidos
          WHERE driver_id = u.id 
            AND estado = 'ENTREGADO' 
            AND entregado_en >= CURRENT_DATE
        ) as entregas_hoy,
        (
          SELECT COUNT(*)::int FROM sub_pedidos
          WHERE driver_id = u.id 
            AND estado = 'ENTREGADO' 
            AND entregado_en >= DATE_TRUNC('month', CURRENT_DATE)
        ) as entregas_mes,
        (
          SELECT COALESCE(SUM(costo_envio), 0)::numeric 
          FROM sub_pedidos
          WHERE driver_id = u.id AND estado = 'ENTREGADO'
        ) as total_envios
      FROM usuarios u
      LEFT JOIN sub_pedidos sp ON sp.driver_id = u.id AND sp.estado = 'ENTREGADO'
      WHERE u.role = 'DRIVER' AND u.activo = TRUE
      GROUP BY u.id, u.nombre, u.celular
      ORDER BY total_entregas DESC
      LIMIT 10
    `

    // 5. Estado de pedidos (para gráfico de torta)
    const porEstado = await sql`
      SELECT estado, COUNT(*)::int as total
      FROM sub_pedidos
      WHERE creado_en >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY estado
    `

    return Response.json({
      ok: true,
      data: {
        resumen: {
          pedidosHoy: pedidosHoy[0].total,
          pedidosActivos: pedidosActivos[0].total,
          restaurantes: restaurantes[0].total,
          driversActivos: driversActivos[0].total,
          clientes: clientes[0].total,
          ingresosHoy: Number(ingresosHoy[0].total),
        },
        pedidosPorDia: pedidosPorDia.map((r: any) => ({
          fecha: r.fecha,
          total: r.total,
          ingresos: Number(r.ingresos),
        })),
        pedidosPorMes: pedidosPorMes.map((r: any) => ({
          mes: r.mes,
          total: r.total,
          ingresos: Number(r.ingresos),
        })),
        rankingDrivers: rankingDrivers.map((r: any) => ({
          id: r.id,
          nombre: r.nombre,
          celular: r.celular,
          totalEntregas: r.total_entregas,
          entregasHoy: r.entregas_hoy,
          entregasMes: r.entregas_mes,
          totalEnvios: Number(r.total_envios),
        })),
        porEstado: porEstado.map((r: any) => ({
          estado: r.estado,
          total: r.total,
        })),
      },
    })
  } catch (error) {
    console.error('GET dashboard stats error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
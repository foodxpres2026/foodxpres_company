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

    // Traemos los pedidos PADRE con sus sub-pedidos agregados
    const pedidosRows = restauranteId
      ? await sql`
          SELECT 
            p.id,
            p.codigo as pedido_codigo,
            p.subtotal,
            p.total_envio,
            p.propina,
            p.vip,
            p.costo_vip,
            p.total,
            p.notas,
            p.estado_global,
            p.creado_en,
            u.nombre as cliente_nombre,
            u.celular as cliente_celular
          FROM pedidos p
          INNER JOIN usuarios u ON u.id = p.usuario_id
          WHERE EXISTS (
            SELECT 1 FROM sub_pedidos sp 
            WHERE sp.pedido_id = p.id 
              AND sp.restaurante_id = ${restauranteId}
          )
          ORDER BY p.creado_en DESC
          LIMIT 200
        `
      : await sql`
          SELECT 
            p.id,
            p.codigo as pedido_codigo,
            p.subtotal,
            p.total_envio,
            p.propina,
            p.vip,
            p.costo_vip,
            p.total,
            p.notas,
            p.estado_global,
            p.creado_en,
            u.nombre as cliente_nombre,
            u.celular as cliente_celular
          FROM pedidos p
          INNER JOIN usuarios u ON u.id = p.usuario_id
          ORDER BY p.creado_en DESC
          LIMIT 200
        `

    if (pedidosRows.length === 0) {
      return Response.json({ ok: true, data: [] })
    }

    const pedidoIds = pedidosRows.map((p: any) => p.id)

    // Traemos todos los sub-pedidos de esos pedidos
    const subsRows = await sql`
      SELECT 
        sp.id,
        sp.pedido_id,
        sp.restaurante_id,
        sp.driver_id,
        sp.estado,
        sp.subtotal,
        sp.costo_envio,
        sp.distancia_km,
        sp.tiempo_estimado,
        sp.direccion_snapshot,
        sp.creado_en,
        r.nombre as restaurante_nombre,
        d.nombre as driver_nombre
      FROM sub_pedidos sp
      INNER JOIN restaurantes r ON r.id = sp.restaurante_id
      LEFT JOIN usuarios d ON d.id = sp.driver_id
      WHERE sp.pedido_id = ANY(${pedidoIds}::uuid[])
      ORDER BY sp.creado_en ASC
    `

    // Agrupar subs por pedido
    const subsMap = new Map<string, any[]>()
    for (const sp of subsRows) {
      const key = (sp as any).pedido_id
      if (!subsMap.has(key)) subsMap.set(key, [])
      subsMap.get(key)!.push(sp)
    }

    // Construir la respuesta final
    const data = pedidosRows.map((p: any) => {
      const subs = subsMap.get(p.id) || []

      // Determinar estado "visible" del pedido agrupado:
      // Si todos los subs están en el mismo estado → ese estado
      // Si no → usamos el estado del pedido padre (estado_global)
      const estadosUnicos = [...new Set(subs.map((s: any) => s.estado))]
      const estadoVisible =
        estadosUnicos.length === 1 ? estadosUnicos[0] : p.estado_global

      // Primer restaurante como "principal" para el card
      const restaurantePrincipal = subs[0]?.restaurante_nombre || 'Sin local'
      const restaurantesExtra = subs.slice(1).map((s: any) => s.restaurante_nombre)

      // Dirección (la primera, todas las partes comparten la misma dirección)
      const direccionSnapshot = subs[0]?.direccion_snapshot || {}

      // Driver (si todos tienen el mismo driver)
      const driversUnicos = [...new Set(subs.map((s: any) => s.driver_nombre).filter(Boolean))]
      const driverNombre = driversUnicos.length === 1 ? driversUnicos[0] : null

      return {
        id: p.id, // id del pedido PADRE
        pedido_codigo: p.pedido_codigo,
        estado: estadoVisible,
        subtotal: p.subtotal,
        total_envio: p.total_envio,
        propina: p.propina,
        vip: p.vip,
        costo_vip: p.costo_vip,
        total: p.total,
        notas: p.notas,
        creado_en: p.creado_en,
        cliente_nombre: p.cliente_nombre,
        cliente_celular: p.cliente_celular,
        direccion_snapshot: direccionSnapshot,
        restaurante_principal: restaurantePrincipal,
        restaurantes_extra: restaurantesExtra,
        num_locales: subs.length,
        driver_nombre: driverNombre,
        sub_pedidos: subs.map((s: any) => ({
          id: s.id,
          restaurante_id: s.restaurante_id,
          restaurante_nombre: s.restaurante_nombre,
          estado: s.estado,
          subtotal: s.subtotal,
          costo_envio: s.costo_envio,
          driver_nombre: s.driver_nombre,
          distancia_km: s.distancia_km,
        })),
      }
    })

    return Response.json({ ok: true, data })
  } catch (error) {
    console.error('GET pedidos error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar pedidos' },
      { status: 500 }
    )
  }
}
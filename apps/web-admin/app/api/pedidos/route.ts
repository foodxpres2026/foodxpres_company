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
    const restauranteIdRaw = searchParams.get('restaurante_id')
    const restauranteId = restauranteIdRaw && /^[0-9a-f-]{36}$/i.test(restauranteIdRaw) ? restauranteIdRaw : null
    const driverIdRaw = searchParams.get('driver_id')
    const driverId = driverIdRaw && /^[0-9a-f-]{36}$/i.test(driverIdRaw) ? driverIdRaw : null
    const codigo = (searchParams.get('codigo') || '').trim().slice(0, 40)
    const estadoSolicitado = searchParams.get('estado') || 'TODOS'
    const estadosPermitidos = ['TODOS', 'ACTIVOS', 'PENDIENTE', 'ACEPTADO', 'LISTO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO']
    const estado = estadosPermitidos.includes(estadoSolicitado) ? estadoSolicitado : 'TODOS'
    const fechaDesdeRaw = searchParams.get('desde') || ''
    const fechaHastaRaw = searchParams.get('hasta') || ''
    const fechaValida = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
      const parsed = new Date(`${value}T00:00:00Z`)
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    }
    const fechaDesde = fechaValida(fechaDesdeRaw) ? fechaDesdeRaw : null
    const fechaHasta = fechaValida(fechaHastaRaw) ? fechaHastaRaw : null
    if (driverIdRaw && !driverId) return Response.json({ ok: false, error: 'Driver inválido' }, { status: 400 })
    if (restauranteIdRaw && !restauranteId) return Response.json({ ok: false, error: 'Restaurante inválido' }, { status: 400 })
    if ((fechaDesdeRaw && !fechaDesde) || (fechaHastaRaw && !fechaHasta)) return Response.json({ ok: false, error: 'Fecha inválida' }, { status: 400 })
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) return Response.json({ ok: false, error: 'La fecha inicial debe ser anterior a la fecha final' }, { status: 400 })

    // Traemos los pedidos PADRE con sus sub-pedidos agregados
    const pedidosRows = await sql`
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
          WHERE (${restauranteId}::uuid IS NULL OR EXISTS (
            SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.restaurante_id = ${restauranteId}::uuid
          ))
            AND (${driverId}::uuid IS NULL OR EXISTS (
              SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.driver_id = ${driverId}::uuid
            ))
            AND (${codigo} = '' OR p.codigo ILIKE '%' || ${codigo} || '%' OR u.nombre ILIKE '%' || ${codigo} || '%' OR u.celular ILIKE '%' || ${codigo} || '%')
            AND (${fechaDesde}::date IS NULL OR p.creado_en >= (${fechaDesde}::date::timestamp AT TIME ZONE 'America/Lima'))
            AND (${fechaHasta}::date IS NULL OR p.creado_en < ((${fechaHasta}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Lima'))
            AND (
              ${estado} = 'TODOS'
              OR (${estado} = 'ACTIVOS' AND COALESCE(p.estado_global, '') NOT IN ('ENTREGADO', 'RECHAZADO', 'CANCELADO'))
              OR (${estado} = 'PENDIENTE' AND (p.estado_global = 'PENDIENTE' OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado = 'PENDIENTE')))
              OR (${estado} = 'ACEPTADO' AND (p.estado_global IN ('ACEPTADO', 'PREPARANDO') OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado IN ('ACEPTADO', 'PREPARANDO'))))
              OR (${estado} = 'LISTO' AND (p.estado_global = 'LISTO' OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado = 'LISTO')))
              OR (${estado} = 'EN_CAMINO' AND (p.estado_global IN ('ASIGNADO', 'EN_CAMINO', 'ENTREGA_PENDIENTE_CONFIRMACION') OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado IN ('ASIGNADO', 'EN_CAMINO', 'ENTREGA_PENDIENTE_CONFIRMACION'))))
              OR (${estado} = 'ENTREGADO' AND (p.estado_global = 'ENTREGADO' OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado = 'ENTREGADO')))
              OR (${estado} = 'RECHAZADO' AND (p.estado_global = 'RECHAZADO' OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado = 'RECHAZADO')))
              OR (${estado} = 'CANCELADO' AND (p.estado_global = 'CANCELADO' OR EXISTS (SELECT 1 FROM sub_pedidos sp WHERE sp.pedido_id = p.id AND sp.estado = 'CANCELADO')))
            )
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
        sp.entrega_reportada_en,
        sp.cliente_confirmo_en,
        sp.entrega_cerrada_admin_en,
        sp.driver_id,
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
          entrega_reportada_en: s.entrega_reportada_en,
          cliente_confirmo_en: s.cliente_confirmo_en,
          entrega_cerrada_admin_en: s.entrega_cerrada_admin_en,
          driver_id: s.driver_id,
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

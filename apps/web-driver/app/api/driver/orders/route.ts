import { NextRequest } from 'next/server'
import { getDriverSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 25
export async function GET(request: NextRequest) {
  const driver = await getDriverSession()
  if (!driver) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })

  const section = request.nextUrl.searchParams.get('section') ?? 'available'
  if (!['available', 'current', 'history'].includes(section)) {
    return Response.json({ ok: false, error: 'Sección inválida' }, { status: 400 })
  }
  const rawOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0)
  const offset = Number.isSafeInteger(rawOffset) && rawOffset > 0 ? Math.min(rawOffset, 100_000) : 0

  try {
    const sql = getSql()
    let rows: any[]
    if (section === 'available') {
      rows = await sql`
        SELECT sp.id, sp.estado, sp.subtotal, sp.costo_envio, sp.distancia_km,
               sp.tiempo_estimado, sp.direccion_snapshot, sp.creado_en,
               sp.entrega_reportada_en, sp.driver_comision_monto,
               p.codigo AS pedido_codigo, p.notas AS pedido_notas,
               r.nombre AS restaurante_nombre, r.direccion_fisica AS restaurante_direccion,
               r.lat AS restaurante_lat, r.lng AS restaurante_lng,
               r.celular AS restaurante_celular, u.nombre AS cliente_nombre, u.celular AS cliente_celular
        FROM sub_pedidos sp INNER JOIN pedidos p ON p.id = sp.pedido_id
        INNER JOIN restaurantes r ON r.id = sp.restaurante_id INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE sp.driver_id IS NULL AND sp.estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO')
        ORDER BY CASE WHEN sp.estado = 'LISTO' THEN 0 ELSE 1 END,
                 sp.listo_en DESC NULLS LAST, sp.creado_en DESC
        LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
      ` as any[]
    } else if (section === 'current') {
      rows = await sql`
        SELECT sp.id, sp.estado, sp.subtotal, sp.costo_envio, sp.distancia_km,
               sp.tiempo_estimado, sp.direccion_snapshot, sp.creado_en,
               (SELECT h.creado_en FROM pedido_estado_historial h WHERE h.sub_pedido_id = sp.id AND h.cambiado_por = sp.driver_id AND h.notas IN ('Pedido aceptado por el driver', 'Pedido reservado por el driver') ORDER BY h.creado_en LIMIT 1) AS driver_asignado_en,
               (SELECT h.creado_en FROM pedido_estado_historial h WHERE h.sub_pedido_id = sp.id AND h.cambiado_por = sp.driver_id AND h.notas = 'LLEGUE' ORDER BY h.creado_en LIMIT 1) AS driver_llego_en,
               sp.listo_en, sp.recogido_en, sp.entregado_en,
               sp.entrega_reportada_en, sp.driver_comision_monto,
               p.codigo AS pedido_codigo, p.notas AS pedido_notas,
               r.nombre AS restaurante_nombre, r.direccion_fisica AS restaurante_direccion,
               r.lat AS restaurante_lat, r.lng AS restaurante_lng,
               r.celular AS restaurante_celular, u.nombre AS cliente_nombre, u.celular AS cliente_celular
        FROM sub_pedidos sp INNER JOIN pedidos p ON p.id = sp.pedido_id
        INNER JOIN restaurantes r ON r.id = sp.restaurante_id INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE sp.driver_id = ${driver.id} AND sp.estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGA_PENDIENTE_CONFIRMACION')
        ORDER BY sp.creado_en DESC LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
      ` as any[]
    } else {
      rows = await sql`
        SELECT sp.id, sp.estado, sp.subtotal, sp.costo_envio, sp.distancia_km,
               sp.tiempo_estimado, sp.direccion_snapshot, sp.creado_en,
               (SELECT h.creado_en FROM pedido_estado_historial h WHERE h.sub_pedido_id = sp.id AND h.cambiado_por = sp.driver_id AND h.notas IN ('Pedido aceptado por el driver', 'Pedido reservado por el driver') ORDER BY h.creado_en LIMIT 1) AS driver_asignado_en,
               (SELECT h.creado_en FROM pedido_estado_historial h WHERE h.sub_pedido_id = sp.id AND h.cambiado_por = sp.driver_id AND h.notas = 'LLEGUE' ORDER BY h.creado_en LIMIT 1) AS driver_llego_en,
               sp.listo_en, sp.recogido_en, sp.entregado_en,
               sp.entrega_reportada_en, sp.driver_comision_monto,
               p.codigo AS pedido_codigo, p.notas AS pedido_notas,
               r.nombre AS restaurante_nombre, r.direccion_fisica AS restaurante_direccion,
               r.lat AS restaurante_lat, r.lng AS restaurante_lng,
               r.celular AS restaurante_celular, u.nombre AS cliente_nombre, u.celular AS cliente_celular
        FROM sub_pedidos sp INNER JOIN pedidos p ON p.id = sp.pedido_id
        INNER JOIN restaurantes r ON r.id = sp.restaurante_id INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE sp.driver_id = ${driver.id} AND sp.estado IN ('ENTREGA_PENDIENTE_CONFIRMACION', 'ENTREGADO', 'CANCELADO', 'RECHAZADO')
        ORDER BY COALESCE(sp.entregado_en, sp.creado_en) DESC LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
      ` as any[]
    }

    const hasMore = rows.length > PAGE_SIZE
    const page = rows.slice(0, PAGE_SIZE)
    const ids = page.map((order) => order.id)
    const items = ids.length ? await sql`
      SELECT pi.sub_pedido_id, pi.id, pi.nombre_snapshot, pi.cantidad, pi.subtotal, pi.notas
      FROM pedido_items pi WHERE pi.sub_pedido_id = ANY(${ids}::uuid[]) ORDER BY pi.creado_en
    ` as any[] : []
    const itemsByOrder = new Map<string, any[]>()
    for (const item of items) itemsByOrder.set(item.sub_pedido_id, [...(itemsByOrder.get(item.sub_pedido_id) ?? []), item])

    let disponible: boolean | null = null
    if (section === 'available') {
      const status = await sql`SELECT disponible FROM driver_detalles WHERE usuario_id = ${driver.id} LIMIT 1` as { disponible: boolean }[]
      disponible = status[0]?.disponible ?? false
    }
    const balanceRows = await sql`
      SELECT COALESCE((SELECT SUM(monto) FROM comisiones_generadas
        WHERE beneficiario_tipo = 'DRIVER' AND beneficiario_id = ${driver.id}), 0)
        - COALESCE((SELECT SUM(monto) FROM comision_pagos
        WHERE beneficiario_tipo = 'DRIVER' AND beneficiario_id = ${driver.id}), 0) AS saldo
    ` as { saldo: string | number }[]
    return Response.json({
      ok: true,
      data: page.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] })),
      hasMore,
      nextOffset: offset + page.length,
      disponible,
      comisionPendiente: Number(balanceRows[0]?.saldo ?? 0),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET driver/orders error:', error)
    return Response.json({ ok: false, error: 'No se pudieron cargar los pedidos' }, { status: 500 })
  }
}

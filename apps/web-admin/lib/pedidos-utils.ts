import { sql } from './db'

// ============================================================
// RECALCULAR ESTADO GLOBAL DEL PEDIDO
// ============================================================
// Reglas:
// - Si TODOS entregados → ENTREGADO
// - Si TODOS cancelados → CANCELADO
// - Si TODOS rechazados → RECHAZADO
// - Si algunos activos y otros rechazados/cancelados → PARCIAL
// - Si alguno en camino → EN_CAMINO
// - Si alguno listo → LISTO
// - Si alguno aceptado → ACEPTADO
// - Si todos pendientes → PENDIENTE
// ============================================================
export async function recalcularPedido(pedidoId: string) {
  const subs = await sql`
    SELECT estado, subtotal, costo_envio
    FROM sub_pedidos
    WHERE pedido_id = ${pedidoId}
  `

  if (subs.length === 0) return

  const estados = subs.map((s: any) => s.estado)

  // ============================================================
  // 1. Calcular estado global
  // ============================================================
  let nuevoEstado = 'PENDIENTE'

  const todosEntregados = estados.every((e: string) => e === 'ENTREGADO')
  const todosCancelados = estados.every((e: string) => e === 'CANCELADO')
  const todosRechazados = estados.every((e: string) => e === 'RECHAZADO')
  const todosFinalizados = estados.every((e: string) =>
    ['ENTREGADO', 'RECHAZADO', 'CANCELADO'].includes(e)
  )
  const algunRechazadoOCancelado = estados.some((e: string) =>
    ['RECHAZADO', 'CANCELADO'].includes(e)
  )

  if (todosEntregados) {
    nuevoEstado = 'ENTREGADO'
  } else if (todosCancelados) {
    nuevoEstado = 'CANCELADO'
  } else if (todosRechazados) {
    nuevoEstado = 'RECHAZADO'
  } else if (todosFinalizados || algunRechazadoOCancelado) {
    // Algunos terminaron, otros rechazados → parcial
    nuevoEstado = 'PARCIAL'
  } else if (estados.some((e: string) => e === 'EN_CAMINO')) {
    nuevoEstado = 'EN_CAMINO'
  } else if (estados.some((e: string) => e === 'LISTO')) {
    nuevoEstado = 'LISTO'
  } else if (estados.some((e: string) => e === 'ACEPTADO' || e === 'PREPARANDO')) {
    nuevoEstado = 'ACEPTADO'
  } else {
    nuevoEstado = 'PENDIENTE'
  }

  // ============================================================
  // 2. Recalcular totales (sin contar rechazados/cancelados)
  // ============================================================
  const subtotalActivo = subs
    .filter((s: any) => !['RECHAZADO', 'CANCELADO'].includes(s.estado))
    .reduce((sum: number, s: any) => sum + Number(s.subtotal), 0)

  const envioActivo = subs
    .filter((s: any) => !['RECHAZADO', 'CANCELADO'].includes(s.estado))
    .reduce((sum: number, s: any) => sum + Number(s.costo_envio), 0)

  // Traer propina y costo VIP del pedido padre
  const pedidoRows = await sql`
    SELECT propina, vip, costo_vip FROM pedidos WHERE id = ${pedidoId} LIMIT 1
  `
  const pedido = pedidoRows[0] as any
  const propina = Number(pedido?.propina || 0)
  const costoVip = Number(pedido?.costo_vip || 0)
  const nuevoTotal = subtotalActivo + envioActivo + propina + costoVip

  // ============================================================
  // 3. Actualizar
  // ============================================================
  await sql`
    UPDATE pedidos SET
      estado_global = ${nuevoEstado},
      subtotal = ${subtotalActivo},
      total_envio = ${envioActivo},
      total = ${nuevoTotal},
      actualizado_en = NOW()
    WHERE id = ${pedidoId}
  `

  return {
    estado_global: nuevoEstado,
    subtotal: subtotalActivo,
    total_envio: envioActivo,
    total: nuevoTotal,
  }
}
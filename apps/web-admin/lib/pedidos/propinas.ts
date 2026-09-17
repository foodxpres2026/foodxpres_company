import { sql } from '../db'

// ============================================================
// ASIGNAR PROPINA + VIP AL PRIMER DRIVER QUE TOME UN PEDIDO
// ============================================================
// Regla:
// - Si nadie del pedido padre se la quedó → este la toma
// - Si ya alguien la tiene → este no recibe nada
// ============================================================
export async function asignarPropinaAlDriver(subPedidoId: string) {
  // 1. Obtener el sub_pedido actual con su pedido padre
  const info = (await sql`
    SELECT 
      sp.id,
      sp.pedido_id,
      sp.driver_id,
      sp.se_quedo_propina,
      p.propina,
      p.costo_vip
    FROM sub_pedidos sp
    INNER JOIN pedidos p ON p.id = sp.pedido_id
    WHERE sp.id = ${subPedidoId}
    LIMIT 1
  `) as any[]

  if (info.length === 0) return
  const sp = info[0]

  // 2. Si este sub_pedido YA tiene la propina, no hacer nada
  if (sp.se_quedo_propina) return

  // 3. Verificar si OTRO sub_pedido del mismo padre ya la tiene
  const otros = (await sql`
    SELECT id, propina_vip_monto
    FROM sub_pedidos
    WHERE pedido_id = ${sp.pedido_id}
      AND se_quedo_propina = TRUE
      AND id != ${subPedidoId}
    LIMIT 1
  `) as any[]

  if (otros.length > 0) {
    // Ya alguien la tiene → este no recibe nada
    return
  }

  // 4. Nadie la tiene → este la toma
  const montoTotal = Number(sp.propina) + Number(sp.costo_vip)

  await sql`
    UPDATE sub_pedidos SET
      se_quedo_propina = TRUE,
      propina_vip_monto = ${montoTotal}
    WHERE id = ${subPedidoId}
  `
}

// ============================================================
// REASIGNAR PROPINA CUANDO SE CAMBIA EL DRIVER DE UN SUB_PEDIDO
// ============================================================
// Si el sub_pedido que cambia tenía la propina → se transfiere al nuevo driver
// Si no la tenía → no pasa nada
// ============================================================
export async function transferirPropinaSiAplica(subPedidoId: string) {
  // 1. Ver si este sub_pedido tenía la propina
  const sp = (await sql`
    SELECT se_quedo_propina, propina_vip_monto
    FROM sub_pedidos
    WHERE id = ${subPedidoId}
    LIMIT 1
  `) as any[]

  if (sp.length === 0) return

  // Si no la tenía → no hacer nada
  if (!sp[0].se_quedo_propina) return

  // Si la tenía → se queda igual (el driver cambió pero el sub_pedido sigue
  // siendo el que "tiene" la propina). El monto sigue asignado a este sub_pedido
  // y por ende al nuevo driver automáticamente.
  // No hace falta hacer nada más.
}
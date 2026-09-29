import { randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getLocalSession } from '@/lib/auth'
import { getSql } from '@/lib/db'
import { calculateLocalShipping } from '@/lib/autopedido'

export const dynamic = 'force-dynamic'
const itemSchema = z.object({ plato_id: z.string().uuid(), cantidad: z.number().int().min(1).max(99), notas: z.string().max(100).optional().nullable(), opciones: z.array(z.object({ grupo_id: z.string().uuid(), choice_id: z.string().uuid() })).max(20) })
const orderSchema = z.object({ direccion: z.string().min(3).max(255), referencia: z.string().max(255).optional().nullable(), lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180), notas: z.string().max(500).optional().nullable(), vip: z.boolean().default(false), items: z.array(itemSchema).min(1).max(50) })
const locationSchema = z.object({ direccion: z.string().min(3).max(255), referencia: z.string().max(255).optional().nullable(), lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) })

async function getMenu(sql: ReturnType<typeof getSql>, restaurantId: string) {
  const rows = await sql`
    SELECT p.id AS plato_id, p.nombre AS plato_nombre, p.descripcion, p.precio,
           g.id AS grupo_id, g.titulo AS grupo_titulo, g.requerido, g.minimo, g.maximo,
           c.id AS choice_id, c.nombre AS choice_nombre, c.precio_extra
    FROM platos p JOIN restaurantes r ON r.id = p.restaurante_id
    LEFT JOIN grupos_opciones g ON g.plato_id = p.id
    LEFT JOIN opciones_choices c ON c.grupo_id = g.id
    WHERE p.restaurante_id = ${restaurantId} AND p.disponible = TRUE AND r.activo = TRUE
    ORDER BY p.orden, g.orden, c.orden
  ` as any[]
  const menu = new Map<string, any>()
  for (const row of rows) {
    let product = menu.get(row.plato_id)
    if (!product) { product = { id: row.plato_id, nombre: row.plato_nombre, descripcion: row.descripcion, precio: Number(row.precio), grupos: [] }; menu.set(row.plato_id, product) }
    if (row.grupo_id) {
      let group = product.grupos.find((g: any) => g.id === row.grupo_id)
      if (!group) { group = { id: row.grupo_id, titulo: row.grupo_titulo, requerido: row.requerido, minimo: Number(row.minimo), maximo: Number(row.maximo), choices: [] }; product.grupos.push(group) }
      if (row.choice_id) group.choices.push({ id: row.choice_id, nombre: row.choice_nombre, precio_extra: Number(row.precio_extra) })
    }
  }
  return [...menu.values()]
}

export async function GET() {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  try {
    const sql = getSql()
    const [restaurantRows, menu, config] = await Promise.all([
      sql`SELECT id, nombre, celular, direccion_fisica, referencia, lat, lng, activo, costo_envio_minimo FROM restaurantes WHERE id = ${staff.restauranteId} LIMIT 1` as Promise<any[]>,
      getMenu(sql, staff.restauranteId),
      sql`SELECT costo_vip FROM configuracion_sistema WHERE id = 1 LIMIT 1` as Promise<any[]>,
    ])
    if (!restaurantRows[0]) return Response.json({ ok: false, error: 'No se encontró el local.' }, { status: 404 })
    return Response.json({ ok: true, data: { restaurant: restaurantRows[0], menu, costo_vip: Number(config[0]?.costo_vip ?? 0) } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { console.error('GET local/autopedidos error:', error); return Response.json({ ok: false, error: 'No se pudo cargar el menú del local.' }, { status: 500 }) }
}

export async function PATCH(req: Request) {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const parsed = locationSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Completa dirección y coordenadas válidas del local.' }, { status: 400 })
  try {
    const sql = getSql(), d = parsed.data
    await sql`UPDATE restaurantes SET direccion_fisica = ${d.direccion}, referencia = ${d.referencia || null}, lat = ${d.lat}, lng = ${d.lng} WHERE id = ${staff.restauranteId}`
    return Response.json({ ok: true })
  } catch (error) { console.error('PATCH local/autopedidos location error:', error); return Response.json({ ok: false, error: 'No se pudo guardar la ubicación del local.' }, { status: 500 }) }
}

export async function POST(req: Request) {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const parsed = orderSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Revisa dirección, ubicación y productos.' }, { status: 400 })
  try {
    const sql = getSql(), data = parsed.data
    const restaurants = await sql`SELECT id, nombre, celular, lat, lng, activo FROM restaurantes WHERE id = ${staff.restauranteId} LIMIT 1` as any[]
    const restaurant = restaurants[0]
    if (!restaurant?.activo) return Response.json({ ok: false, error: 'El local está inactivo.' }, { status: 409 })
    if (!restaurant.celular) return Response.json({ ok: false, error: 'Registra el teléfono del local antes de crear autopedidos.' }, { status: 409 })
    const menu = await getMenu(sql, staff.restauranteId), products = new Map(menu.map((p: any) => [p.id, p]))
    let subtotalCents = 0
    const normalized: any[] = []
    for (const item of data.items) {
      const product: any = products.get(item.plato_id)
      if (!product) return Response.json({ ok: false, error: 'Un producto ya no está disponible. Actualiza el menú.' }, { status: 409 })
      const choices: any[] = []
      for (const selected of item.opciones) {
        const group = product.grupos.find((g: any) => g.id === selected.grupo_id)
        const choice = group?.choices.find((c: any) => c.id === selected.choice_id)
        if (!choice || choices.some((c) => c.choice_id === choice.id)) return Response.json({ ok: false, error: `Opción no válida en ${product.nombre}.` }, { status: 409 })
        choices.push({ grupo_id: group.id, grupo_titulo: group.titulo, choice_id: choice.id, choice_nombre: choice.nombre, precio_extra: choice.precio_extra })
      }
      for (const group of product.grupos) {
        const count = choices.filter((c) => c.grupo_id === group.id).length
        if (count < (group.requerido ? Math.max(1, group.minimo) : group.minimo) || count > group.maximo) return Response.json({ ok: false, error: `Completa las opciones de ${product.nombre}.` }, { status: 400 })
      }
      const unit = Math.round(product.precio * 100) + choices.reduce((sum, c) => sum + Math.round(c.precio_extra * 100), 0)
      subtotalCents += unit * item.cantidad
      normalized.push({ ...item, nombre: product.nombre, unitCents: unit, opciones: choices })
    }
    const shipping = await calculateLocalShipping(staff.restauranteId, data.lat, data.lng)
    const vipRows = await sql`SELECT costo_vip FROM configuracion_sistema WHERE id = 1 LIMIT 1` as any[]
    const [localRules, driverRules] = await Promise.all([
      sql`SELECT id, modalidad, valor FROM comision_reglas WHERE beneficiario_tipo = 'LOCAL'
          AND restaurante_id = ${staff.restauranteId} ORDER BY creado_en DESC, id DESC LIMIT 1` as Promise<any[]>,
      sql`SELECT id, valor FROM comision_reglas WHERE beneficiario_tipo = 'DRIVER'
          ORDER BY creado_en DESC, id DESC LIMIT 1` as Promise<any[]>,
    ])
    const localRule = localRules[0] ?? null
    const driverRule = driverRules[0] ?? null
    const vipCents = data.vip ? Math.round(Number(vipRows[0]?.costo_vip || 0) * 100) : 0
    const subtotal = subtotalCents / 100, shippingCents = Math.round(shipping.costo * 100)
    const total = (subtotalCents + shippingCents + vipCents) / 100
    const localCommission = localRule
      ? (localRule.modalidad === 'FIJA' ? Number(localRule.valor) : Math.round(subtotalCents * Number(localRule.valor) / 100) / 100)
      : 0
    const driverCommission = Math.round(shippingCents * Number(driverRule?.valor ?? 0) / 100) / 100
    const orderId = randomUUID(), subId = randomUUID(), code = `P-${randomBytes(5).toString('hex').toUpperCase()}`
    const queries: any[] = [
      // Use existing schema only; the order snapshot marks this as a local self-order.
      sql`INSERT INTO pedidos (id, codigo, usuario_id, subtotal, total_envio, vip, costo_vip, total, notas, estado_global) VALUES (${orderId}, ${code}, ${staff.id}, ${subtotal}, ${shippingCents / 100}, ${data.vip}, ${vipCents / 100}, ${total}, ${data.notas || null}, 'PENDIENTE')`,
      sql`INSERT INTO sub_pedidos (id, pedido_id, restaurante_id, estado, subtotal, costo_envio, distancia_km, tiempo_estimado, direccion_snapshot, notas, local_comision_regla_id, local_comision_modalidad, local_comision_valor, local_comision_monto, driver_comision_regla_id, driver_comision_valor, driver_comision_monto) VALUES (${subId}, ${orderId}, ${staff.restauranteId}, 'PENDIENTE', ${subtotal}, ${shippingCents / 100}, ${shipping.distancia_km}, ${shipping.duracion_min}, ${JSON.stringify({ etiqueta: 'Autopedido', direccion: data.direccion, referencia: data.referencia || null, lat: data.lat, lng: data.lng })}::jsonb, ${data.notas || null}, ${localRule?.id ?? null}, ${localRule?.modalidad ?? 'FIJA'}, ${Number(localRule?.valor ?? 0)}, ${localCommission}, ${driverRule?.id ?? null}, ${Number(driverRule?.valor ?? 0)}, ${driverCommission})`,
      sql`INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas) VALUES (${subId}, 'PENDIENTE', ${staff.id}, 'Autopedido registrado por el local')`,
    ]
    for (const item of normalized) {
      const itemId = randomUUID(), lineSubtotal = item.unitCents * item.cantidad / 100
      queries.push(sql`INSERT INTO pedido_items (id, sub_pedido_id, plato_id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas) VALUES (${itemId}, ${subId}, ${item.plato_id}, ${item.nombre}, ${item.unitCents / 100}, ${item.cantidad}, ${lineSubtotal}, ${item.notas || null})`)
      for (const choice of item.opciones) queries.push(sql`INSERT INTO item_opciones (item_id, grupo_titulo_snapshot, choice_nombre_snapshot, precio_extra) VALUES (${itemId}, ${choice.grupo_titulo}, ${choice.choice_nombre}, ${choice.precio_extra})`)
    }
    await sql.transaction(queries)
    return Response.json({ ok: true, data: { id: orderId, codigo: code, total, costo_envio: shipping.costo, distancia_km: shipping.distancia_km } }, { status: 201 })
  } catch (error) { console.error('POST local/autopedidos error:', error); return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No se pudo crear el autopedido.' }, { status: 500 }) }
}

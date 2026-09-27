import { randomBytes, randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getLocalStaff } from '@/lib/local-auth'
import { sql } from '@/lib/db'

const menuQuery = `
  SELECT p.id AS plato_id, p.nombre AS plato_nombre, p.descripcion,
         p.precio, g.id AS grupo_id, g.titulo AS grupo_titulo,
         g.requerido, g.minimo, g.maximo,
         c.id AS choice_id, c.nombre AS choice_nombre, c.precio_extra
  FROM platos p
  INNER JOIN restaurantes r ON r.id = p.restaurante_id
  LEFT JOIN grupos_opciones g ON g.plato_id = p.id
  LEFT JOIN opciones_choices c ON c.grupo_id = g.id
  WHERE p.restaurante_id = $1 AND p.disponible = TRUE AND r.activo = TRUE
  ORDER BY p.orden, g.orden, c.orden
`

const itemSchema = z.object({
  plato_id: z.string().uuid(),
  cantidad: z.number().int().min(1).max(99),
  notas: z.string().max(100).optional().nullable(),
  opciones: z.array(z.object({ grupo_id: z.string().uuid(), choice_id: z.string().uuid() })).max(20),
})

const createSchema = z.object({
  nombre: z.string().min(2).max(120),
  celular: z.string().regex(/^9\d{8}$/),
  direccion: z.string().min(3).max(255),
  referencia: z.string().max(255).optional().nullable(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  notas: z.string().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
})

function orderCode() {
  return `P-${randomBytes(5).toString('hex').toUpperCase()}`
}

export async function GET(req: NextRequest) {
  const staff = await getLocalStaff(req)
  if (!staff) return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  try {
    const rows = (await sql.query(menuQuery, [staff.restaurantId])) as any[]
    const menu = new Map<string, any>()
    for (const row of rows) {
      let plato = menu.get(row.plato_id)
      if (!plato) {
        plato = { id: row.plato_id, nombre: row.plato_nombre, descripcion: row.descripcion, precio: row.precio, grupos: [] }
        menu.set(row.plato_id, plato)
      }
      if (row.grupo_id) {
        let grupo = plato.grupos.find((item: any) => item.id === row.grupo_id)
        if (!grupo) {
          grupo = { id: row.grupo_id, titulo: row.grupo_titulo, requerido: row.requerido, minimo: row.minimo, maximo: row.maximo, choices: [] }
          plato.grupos.push(grupo)
        }
        if (row.choice_id) grupo.choices.push({ id: row.choice_id, nombre: row.choice_nombre, precio_extra: row.precio_extra })
      }
    }
    return Response.json({ ok: true, data: Array.from(menu.values()) })
  } catch (error) {
    console.error('GET autopedido menu error:', error)
    return Response.json({ ok: false, error: 'No se pudo cargar el menú' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const staff = await getLocalStaff(req)
  if (!staff) return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  try {
    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ ok: false, error: 'Revisa los datos del autopedido' }, { status: 400 })
    const data = parsed.data
    const clientApiBase = process.env.CLIENTES_API_URL?.replace(/\/$/, '')
    if (!clientApiBase) return Response.json({ ok: false, error: 'El servicio de envíos todavía no está configurado' }, { status: 503 })

    const restaurantRows = (await sql`
      SELECT id, activo FROM restaurantes WHERE id = ${staff.restaurantId} LIMIT 1
    `) as any[]
    if (restaurantRows.length === 0 || !restaurantRows[0].activo) {
      return Response.json({ ok: false, error: 'El restaurante está inactivo' }, { status: 409 })
    }

    const platoIds = [...new Set(data.items.map((item) => item.plato_id))]
    const menuRows = (await sql.query(menuQuery, [staff.restaurantId])) as any[]
    const platos = new Map<string, any>()
    for (const row of menuRows) {
      let plato = platos.get(row.plato_id)
      if (!plato) {
        plato = { id: row.plato_id, nombre: row.plato_nombre, precio: row.precio, grupos: new Map<string, any>() }
        platos.set(row.plato_id, plato)
      }
      if (row.grupo_id) {
        let grupo = plato.grupos.get(row.grupo_id)
        if (!grupo) {
          grupo = { id: row.grupo_id, titulo: row.grupo_titulo, requerido: row.requerido, minimo: row.minimo, maximo: row.maximo, choices: [] }
          plato.grupos.set(row.grupo_id, grupo)
        }
        if (row.choice_id) grupo.choices.push({ id: row.choice_id, nombre: row.choice_nombre, precio_extra: row.precio_extra })
      }
    }

    const productos = new Set(platoIds)
    if ([...productos].some((id) => !platos.has(id))) {
      return Response.json({ ok: false, error: 'Uno o más productos ya no están disponibles' }, { status: 409 })
    }

    const normalized: any[] = []
    let subtotalCentimos = 0
    for (const item of data.items) {
      const plato = platos.get(item.plato_id)
      const elegidas: any[] = []
      for (const enviada of item.opciones) {
        const grupo = plato.grupos.get(enviada.grupo_id)
        const choice = grupo?.choices.find((opcion: any) => opcion.id === enviada.choice_id)
        if (!grupo || !choice || elegidas.some((op) => op.choice_id === choice.id)) {
          return Response.json({ ok: false, error: `Una opción de ${plato.nombre} no es válida` }, { status: 409 })
        }
        elegidas.push({ grupo_id: grupo.id, grupo_titulo: grupo.titulo, choice_id: choice.id, choice_nombre: choice.nombre, precio_extra: Number(choice.precio_extra) })
      }
      for (const grupo of plato.grupos.values()) {
        const count = elegidas.filter((op) => op.grupo_id === grupo.id).length
        const minimum = grupo.requerido ? Math.max(1, Number(grupo.minimo)) : Number(grupo.minimo)
        if (count < minimum || count > Number(grupo.maximo)) {
          return Response.json({ ok: false, error: `Completa las opciones de ${plato.nombre}` }, { status: 400 })
        }
      }
      const unitCents = Math.round(Number(plato.precio) * 100) + elegidas.reduce((sum, op) => sum + Math.round(op.precio_extra * 100), 0)
      const itemCents = unitCents * item.cantidad
      subtotalCentimos += itemCents
      normalized.push({ ...item, nombre_snapshot: plato.nombre, precio_snapshot: unitCents / 100, subtotal: itemCents / 100, opciones: elegidas })
    }

    let envio: { costo: number; distancia_km: number }
    try {
      const response = await fetch(`${clientApiBase}/api/envio/calcular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurante_id: staff.restaurantId, lat: data.lat, lng: data.lng }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      })
      const result = await response.json()
      if (!response.ok || !result.ok || !result.data) throw new Error('Cálculo de envío no disponible')
      envio = { costo: Number(result.data.costo), distancia_km: Number(result.data.distancia_km) }
    } catch {
      return Response.json({ ok: false, error: 'No se pudo calcular el delivery para esta dirección' }, { status: 503 })
    }

    let customerRows = (await sql`
      SELECT id, role, activo FROM usuarios WHERE celular = ${data.celular} LIMIT 1
    `) as any[]
    if (customerRows.length > 0 && (customerRows[0].role !== 'CUSTOMER' || !customerRows[0].activo)) {
      return Response.json({ ok: false, error: 'Ese celular pertenece a una cuenta que no puede recibir pedidos' }, { status: 409 })
    }
    if (customerRows.length === 0) {
      const newCustomerId = randomUUID()
      customerRows = (await sql`
        INSERT INTO usuarios (id, role, celular, nombre)
        VALUES (${newCustomerId}, 'CUSTOMER', ${data.celular}, ${data.nombre})
        ON CONFLICT (celular) DO NOTHING
        RETURNING id, role, activo
      `) as any[]
      if (customerRows.length === 0) {
        customerRows = (await sql`
          SELECT id, role, activo FROM usuarios WHERE celular = ${data.celular} LIMIT 1
        `) as any[]
      }
      if (customerRows.length === 0 || customerRows[0].role !== 'CUSTOMER' || !customerRows[0].activo) {
        return Response.json({ ok: false, error: 'No se pudo validar al cliente' }, { status: 409 })
      }
    }
    const customerId = customerRows[0].id

    const subtotal = subtotalCentimos / 100
    const envioCentimos = Math.round(envio.costo * 100)
    const total = (subtotalCentimos + envioCentimos) / 100
    const pedidoId = randomUUID()
    const subPedidoId = randomUUID()
    const pedidoCodigo = orderCode()
    const dirSnapshot = { etiqueta: 'Autopedido', direccion: data.direccion, referencia: data.referencia ?? null, lat: data.lat, lng: data.lng }
    const queries: any[] = [
      sql`
        INSERT INTO pedidos (id, codigo, usuario_id, origen, creado_por, subtotal, total_envio, total, notas, estado_global)
        VALUES (${pedidoId}, ${pedidoCodigo}, ${customerId}, 'AUTOPEDIDO', ${staff.id}, ${subtotal}, ${envioCentimos / 100}, ${total}, ${data.notas || null}, 'PENDIENTE')
      `,
      sql`
        INSERT INTO sub_pedidos (id, pedido_id, restaurante_id, estado, subtotal, costo_envio, distancia_km, direccion_snapshot)
        VALUES (${subPedidoId}, ${pedidoId}, ${staff.restaurantId}, 'PENDIENTE', ${subtotal}, ${envioCentimos / 100}, ${envio.distancia_km}, ${JSON.stringify(dirSnapshot)}::jsonb)
      `,
      sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
        VALUES (${subPedidoId}, 'PENDIENTE', ${staff.id}, 'Autopedido registrado por el local')
      `,
    ]
    for (const item of normalized) {
      const itemId = randomUUID()
      queries.push(sql`
        INSERT INTO pedido_items (id, sub_pedido_id, plato_id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas)
        VALUES (${itemId}, ${subPedidoId}, ${item.plato_id}, ${item.nombre_snapshot}, ${item.precio_snapshot}, ${item.cantidad}, ${item.subtotal}, ${item.notas || null})
      `)
      for (const opcion of item.opciones) {
        queries.push(sql`
          INSERT INTO item_opciones (item_id, grupo_titulo_snapshot, choice_nombre_snapshot, precio_extra)
          VALUES (${itemId}, ${opcion.grupo_titulo}, ${opcion.choice_nombre}, ${opcion.precio_extra})
        `)
      }
    }
    await sql.transaction(queries)

    return Response.json({ ok: true, data: { id: pedidoId, codigo: pedidoCodigo, total } }, { status: 201 })
  } catch (error) {
    console.error('POST autopedido error:', error)
    return Response.json({ ok: false, error: 'No se pudo crear el autopedido' }, { status: 500 })
  }
}

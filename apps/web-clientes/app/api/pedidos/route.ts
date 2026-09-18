import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { calcularEnvio } from '@/lib/envio/calcular'

const itemSchema = z.object({
  plato_id: z.string().uuid(),
  nombre_snapshot: z.string(),
  precio_snapshot: z.coerce.number(),
  cantidad: z.coerce.number().int().min(1),
  notas: z.string().max(100).optional().nullable(),
  opciones: z.array(
    z.object({
      grupo_titulo: z.string(),
      choice_nombre: z.string(),
      precio_extra: z.coerce.number().default(0),
    })
  ),
})

const grupoSchema = z.object({
  restaurante_id: z.string().uuid(),
  items: z.array(itemSchema).min(1),
})

const schema = z.object({
  direccion_id: z.string().uuid(),
  propina: z.coerce.number().min(0).default(0),
  vip: z.boolean().default(false),
  notas: z.string().max(500).optional().nullable(),
  grupos: z.array(grupoSchema).min(1),
})

function codigo() {
  return 'P-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { direccion_id, propina, vip, notas, grupos } = parsed.data

    // ============================================
    // 1. Verificar dirección
    // ============================================
    const dirRows = (await sql`
      SELECT id, etiqueta, direccion, referencia, lat, lng
      FROM direcciones
      WHERE id = ${direccion_id} AND usuario_id = ${user.id}
      LIMIT 1
    `) as any[]

    if (dirRows.length === 0) {
      return Response.json(
        { ok: false, error: 'Dirección no válida' },
        { status: 400 }
      )
    }

    const dir = dirRows[0]

    if (!dir.lat || !dir.lng) {
      return Response.json(
        { ok: false, error: 'La dirección no tiene coordenadas' },
        { status: 400 }
      )
    }

    // ============================================
    // 2. Config del sistema (costo VIP)
    // ============================================
    const configRows = (await sql`
      SELECT costo_vip FROM configuracion_sistema WHERE id = 1 LIMIT 1
    `) as any[]

    const costoVip = vip ? Number(configRows[0]?.costo_vip || 0) : 0

    // ============================================
    // 3. Calcular totales de cada grupo
    // ============================================
    const gruposCalculados = []

    for (const g of grupos) {
      let subtotalGrupo = 0

      for (const item of g.items) {
        const extraOpciones = item.opciones.reduce(
          (s, o) => s + o.precio_extra,
          0
        )
        const precioUnitario = item.precio_snapshot + extraOpciones
        subtotalGrupo += precioUnitario * item.cantidad
      }

      // Calcular envío con la dirección del cliente
      const envio = await calcularEnvio(
        g.restaurante_id,
        Number(dir.lat),
        Number(dir.lng)
      )

      if (!envio) {
        return Response.json(
          {
            ok: false,
            error: `No se pudo calcular el envío al restaurante ${g.restaurante_id}`,
          },
          { status: 500 }
        )
      }

      gruposCalculados.push({
        restaurante_id: g.restaurante_id,
        items: g.items,
        subtotal: Math.round(subtotalGrupo * 100) / 100,
        costo_envio: envio.costo,
        distancia_km: envio.distancia_km,
      })
    }

    // ============================================
    // 4. Totales globales
    // ============================================
    const subtotalGlobal = gruposCalculados.reduce(
      (s, g) => s + g.subtotal,
      0
    )
    const envioGlobal = gruposCalculados.reduce(
      (s, g) => s + g.costo_envio,
      0
    )
    const total = subtotalGlobal + envioGlobal + propina + costoVip

    // ============================================
    // 5. Crear pedido PADRE
    // ============================================
    const codigoPedido = codigo()

    const pedidoRows = (await sql`
      INSERT INTO pedidos (
        codigo, usuario_id, subtotal, total_envio, propina, vip,
        costo_vip, total, notas, estado_global
      ) VALUES (
        ${codigoPedido}, ${user.id}, ${subtotalGlobal}, ${envioGlobal},
        ${propina}, ${vip}, ${costoVip}, ${total}, ${notas || null}, 'PENDIENTE'
      )
      RETURNING id, codigo
    `) as any[]

    const pedidoId = pedidoRows[0].id

    // ============================================
    // 6. Crear sub_pedidos + items
    // ============================================
    const dirSnapshot = {
      etiqueta: dir.etiqueta,
      direccion: dir.direccion,
      referencia: dir.referencia,
      lat: Number(dir.lat),
      lng: Number(dir.lng),
    }

    for (const g of gruposCalculados) {
      const spRows = (await sql`
        INSERT INTO sub_pedidos (
          pedido_id, restaurante_id, estado, subtotal, costo_envio,
          distancia_km, direccion_snapshot
        ) VALUES (
          ${pedidoId}, ${g.restaurante_id}, 'PENDIENTE', ${g.subtotal},
          ${g.costo_envio}, ${g.distancia_km},
          ${JSON.stringify(dirSnapshot)}::jsonb
        )
        RETURNING id
      `) as any[]

      const spId = spRows[0].id

      // Items con sus opciones
      for (const item of g.items) {
        const extraOpciones = item.opciones.reduce(
          (s, o) => s + o.precio_extra,
          0
        )
        const precioUnitario = item.precio_snapshot + extraOpciones
        const subtotalItem = precioUnitario * item.cantidad

        const itemRows = (await sql`
          INSERT INTO pedido_items (
            sub_pedido_id, plato_id, nombre_snapshot, precio_snapshot,
            cantidad, subtotal, notas
          ) VALUES (
            ${spId}, ${item.plato_id}, ${item.nombre_snapshot},
            ${precioUnitario}, ${item.cantidad}, ${subtotalItem},
            ${item.notas || null}
          )
          RETURNING id
        `) as any[]

        const itemId = itemRows[0].id

        // Opciones
        for (const op of item.opciones) {
          await sql`
            INSERT INTO item_opciones (
              item_id, grupo_titulo_snapshot,
              choice_nombre_snapshot, precio_extra
            ) VALUES (
              ${itemId}, ${op.grupo_titulo},
              ${op.choice_nombre}, ${op.precio_extra}
            )
          `
        }
      }

      // Historial inicial
      await sql`
        INSERT INTO pedido_estado_historial (
          sub_pedido_id, estado, cambiado_por, notas
        ) VALUES (
          ${spId}, 'PENDIENTE', ${user.id}, 'Pedido recibido'
        )
      `
    }

    return Response.json(
      {
        ok: true,
        data: { id: pedidoId, codigo: codigoPedido },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST pedidos error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear pedido' },
      { status: 500 }
    )
  }
}
import { NextRequest } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { calcularEnvio } from '@/lib/envio/calcular'
import { notifyInternalPush } from '@/lib/push/internal'

// ============================================
// SCHEMAS
// ============================================
const itemSchema = z.object({
  plato_id: z.string().uuid(),
  cantidad: z.number().int().min(1).max(99),
  notas: z.string().max(100).optional().nullable(),
  opciones: z.array(z.object({
    grupo_id: z.string().uuid().optional(),
    choice_id: z.string().uuid().optional(),
    grupo_titulo: z.string().min(1).max(120).optional(),
    choice_nombre: z.string().min(1).max(80).optional(),
  }).refine((op) => Boolean(op.choice_id || (op.grupo_titulo && op.choice_nombre)))),
})

const grupoSchema = z.object({
  restaurante_id: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(50),
})

const createSchema = z.object({
  direccion_id: z.string().uuid(),
  propina: z.number().finite().min(0).max(1000).default(0),
  vip: z.boolean().default(false),
  notas: z.string().max(500).optional().nullable(),
  grupos: z.array(grupoSchema).min(1).max(10),
}).superRefine((data, ctx) => {
  const ids = data.grupos.map((grupo) => grupo.restaurante_id)
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', message: 'No se permiten restaurantes repetidos', path: ['grupos'] })
  }
  if (data.grupos.reduce((total, grupo) => total + grupo.items.length, 0) > 50) {
    ctx.addIssue({ code: 'custom', message: 'El pedido supera el máximo de productos', path: ['grupos'] })
  }
})

function codigo() {
  return `P-${randomBytes(5).toString('hex').toUpperCase()}`
}

// ============================================
// GET → listar pedidos del cliente
// ============================================
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const filtro = searchParams.get('filtro') // 'activos' | 'completados' | null

    let whereEstado = sql``
    if (filtro === 'activos') {
      whereEstado = sql`AND p.estado_global NOT IN ('ENTREGADO', 'CANCELADO', 'RECHAZADO', 'PARCIAL')`
    } else if (filtro === 'completados') {
      whereEstado = sql`AND p.estado_global IN ('ENTREGADO', 'CANCELADO', 'RECHAZADO', 'PARCIAL')`
    }

    const rows = (await sql`
      SELECT 
        p.id,
        p.codigo,
        p.subtotal,
        p.total_envio,
        p.propina,
        p.vip,
        p.costo_vip,
        p.total,
        p.estado_global,
        p.creado_en,
        (
          SELECT COUNT(*)::int FROM sub_pedidos 
          WHERE pedido_id = p.id
        ) as num_locales,
        (
          SELECT r.nombre 
          FROM sub_pedidos sp
          INNER JOIN restaurantes r ON r.id = sp.restaurante_id
          WHERE sp.pedido_id = p.id
          ORDER BY sp.creado_en ASC
          LIMIT 1
        ) as primer_restaurante
      FROM pedidos p
      WHERE p.usuario_id = ${user.id}
        ${whereEstado}
      ORDER BY p.creado_en DESC
      LIMIT 50
    `) as any[]

    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET pedidos error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar pedidos' },
      { status: 500 }
    )
  }
}

// ============================================
// POST → crear pedido
// ============================================
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)

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

    if (dir.lat === null || dir.lng === null) {
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

    // Releer menú y precios en servidor; el carrito del cliente no es fuente de precios.
    const platoIds = [...new Set(grupos.flatMap((grupo) => grupo.items.map((item) => item.plato_id)))]
    const platosRows = (await sql`
      SELECT p.id, p.restaurante_id, p.nombre, p.precio
      FROM platos p
      INNER JOIN restaurantes r ON r.id = p.restaurante_id
      WHERE p.id = ANY(${platoIds}::uuid[])
        AND p.disponible = TRUE
        AND r.activo = TRUE
    `) as any[]
    const platosPorId = new Map(platosRows.map((plato) => [plato.id, plato]))

    if (platosPorId.size !== platoIds.length) {
      return Response.json(
        { ok: false, error: 'Uno o más platos ya no están disponibles' },
        { status: 409 }
      )
    }

    for (const grupo of grupos) {
      if (grupo.items.some((item) => platosPorId.get(item.plato_id)?.restaurante_id !== grupo.restaurante_id)) {
        return Response.json(
          { ok: false, error: 'El carrito contiene platos de otro restaurante' },
          { status: 400 }
        )
      }
    }

    const opcionesRows = (await sql`
      SELECT g.plato_id, g.id AS grupo_id, g.titulo AS grupo_titulo,
             g.requerido, g.minimo, g.maximo,
             c.id AS choice_id, c.nombre AS choice_nombre,
             c.precio_extra
      FROM grupos_opciones g
      LEFT JOIN opciones_choices c ON c.grupo_id = g.id
      WHERE g.plato_id = ANY(${platoIds}::uuid[])
      ORDER BY g.orden, c.orden
    `) as any[]
    const opcionesPorPlato = new Map<string, any[]>()
    for (const row of opcionesRows) {
      const opciones = opcionesPorPlato.get(row.plato_id) ?? []
      opciones.push(row)
      opcionesPorPlato.set(row.plato_id, opciones)
    }

    // ============================================
    // 3. Validar opciones y calcular importes con precios de la BD
    // ============================================
    const gruposCalculados: any[] = []

    for (const g of grupos) {
      let subtotalGrupoCentimos = 0
      const itemsCalculados = []

      for (const item of g.items) {
        const plato = platosPorId.get(item.plato_id)
        if (!plato) {
          return Response.json({ ok: false, error: 'Plato no disponible' }, { status: 409 })
        }
        const definiciones = opcionesPorPlato.get(item.plato_id) ?? []
        const gruposOpciones = new Map<string, any>()
        for (const opcion of definiciones) {
          if (!gruposOpciones.has(opcion.grupo_id)) {
            gruposOpciones.set(opcion.grupo_id, { ...opcion, choices: [] })
          }
          if (opcion.choice_id) gruposOpciones.get(opcion.grupo_id).choices.push(opcion)
        }

        const elegidas: any[] = []
        for (const enviada of item.opciones) {
          const coincidencia = definiciones.find((def) =>
            def.choice_id && (
              enviada.choice_id
                ? def.choice_id === enviada.choice_id && (!enviada.grupo_id || def.grupo_id === enviada.grupo_id)
                : def.grupo_titulo === enviada.grupo_titulo && def.choice_nombre === enviada.choice_nombre
            )
          )
          if (!coincidencia) {
            return Response.json(
              { ok: false, error: `Una opción de ${plato.nombre} ya no es válida` },
              { status: 409 }
            )
          }
          if (elegidas.some((opcion) => opcion.choice_id === coincidencia.choice_id)) {
            return Response.json({ ok: false, error: 'Hay opciones duplicadas' }, { status: 400 })
          }
          elegidas.push(coincidencia)
        }

        for (const definicion of gruposOpciones.values()) {
          const cantidadElegida = elegidas.filter((opcion) => opcion.grupo_id === definicion.grupo_id).length
          const minimo = definicion.requerido
            ? Math.max(1, definicion.minimo)
            : definicion.minimo
          if (cantidadElegida < minimo || cantidadElegida > definicion.maximo) {
            return Response.json(
              { ok: false, error: `Completa las opciones de ${plato.nombre}` },
              { status: 400 }
            )
          }
        }

        const opcionesSnapshot = elegidas.map((opcion) => ({
          grupo_titulo: opcion.grupo_titulo,
          choice_nombre: opcion.choice_nombre,
          precio_extra: Number(opcion.precio_extra),
        }))
        const precioUnitarioCentimos = Math.round(Number(plato.precio) * 100) +
          elegidas.reduce((suma, opcion) => suma + Math.round(Number(opcion.precio_extra) * 100), 0)
        const subtotalItemCentimos = precioUnitarioCentimos * item.cantidad
        subtotalGrupoCentimos += subtotalItemCentimos
        itemsCalculados.push({
          ...item,
          nombre_snapshot: plato.nombre,
          precio_snapshot: precioUnitarioCentimos / 100,
          subtotal: subtotalItemCentimos / 100,
          opciones: opcionesSnapshot,
        })
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

      if (!envio.permitido) {
        const error = envio.razon === 'SUPERA_DISTANCIA_MAXIMA'
          ? `El local está a ${envio.distancia_km.toFixed(1)} km. El máximo permitido es 15 km.`
          : 'No se pudo obtener una ruta real para calcular el envío. Intenta de nuevo más tarde.'
        return Response.json({ ok: false, error }, { status: envio.razon === 'SUPERA_DISTANCIA_MAXIMA' ? 422 : 503 })
      }

      gruposCalculados.push({
        restaurante_id: g.restaurante_id,
        items: itemsCalculados,
        subtotal: subtotalGrupoCentimos / 100,
        costo_envio: envio.costo!,
        distancia_km: envio.distancia_km,
      })
    }

    // ============================================
    // 4. Totales globales
    // ============================================
    const subtotalGlobalCentimos = gruposCalculados.reduce(
      (s, g) => s + Math.round(g.subtotal * 100), 0
    )
    const envioGlobalCentimos = gruposCalculados.reduce(
      (s, g) => s + Math.round(g.costo_envio * 100), 0
    )
    const propinaCentimos = Math.round(propina * 100)
    const costoVipCentimos = Math.round(costoVip * 100)
    const subtotalGlobal = subtotalGlobalCentimos / 100
    const envioGlobal = envioGlobalCentimos / 100
    const total = (subtotalGlobalCentimos + envioGlobalCentimos + propinaCentimos + costoVipCentimos) / 100

    // Congelar las reglas aplicables al crear el pedido evita que un cambio futuro
    // de comisión modifique el saldo pendiente de pedidos anteriores.
    const restauranteIds = gruposCalculados.map((grupo) => grupo.restaurante_id)
    const [localRules, driverRules] = await Promise.all([
      sql`SELECT DISTINCT ON (restaurante_id) restaurante_id, id, modalidad, valor
          FROM comision_reglas WHERE beneficiario_tipo = 'LOCAL' AND tipo_pedido = 'NORMAL'
            AND restaurante_id = ANY(${restauranteIds}::uuid[])
          ORDER BY restaurante_id, creado_en DESC, id DESC` as Promise<any[]>,
      sql`SELECT id, valor FROM comision_reglas WHERE beneficiario_tipo = 'DRIVER'
          ORDER BY creado_en DESC, id DESC LIMIT 1` as Promise<any[]>,
    ])
    const localRuleById = new Map(localRules.map((rule) => [rule.restaurante_id, rule]))
    const driverRule = driverRules[0] ?? null
    for (const group of gruposCalculados) {
      const rule = localRuleById.get(group.restaurante_id)
      const localRate = Number(rule?.valor ?? 0)
      const driverRate = Number(driverRule?.valor ?? 0)
      group.local_rule = rule ?? null
      group.local_commission_amount = rule
        ? (rule.modalidad === 'FIJA' ? localRate : Math.round(group.subtotal * localRate) / 100)
        : 0
      group.driver_rule = driverRule
      group.driver_commission_amount = Math.round(group.costo_envio * driverRate) / 100
    }

    // ============================================
    // 5. Crear pedido PADRE
    // ============================================
    const codigoPedido = codigo()

    const pedidoId = randomUUID()
    const transactionQueries: any[] = []
    transactionQueries.push(sql`
      INSERT INTO pedidos (
        id, codigo, usuario_id, subtotal, total_envio, propina, vip,
        costo_vip, total, notas, estado_global
      ) VALUES (
        ${pedidoId}, ${codigoPedido}, ${user.id}, ${subtotalGlobal}, ${envioGlobal},
        ${propinaCentimos / 100}, ${vip}, ${costoVipCentimos / 100}, ${total}, ${notas || null}, 'PENDIENTE'
      )
    `)

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

    const createdSubOrderIds: string[] = []
    for (const g of gruposCalculados) {
      const spId = randomUUID()
      createdSubOrderIds.push(spId)
      transactionQueries.push(sql`
        INSERT INTO sub_pedidos (
          id, pedido_id, restaurante_id, tipo_pedido, estado, subtotal, costo_envio,
          distancia_km, direccion_snapshot,
          local_comision_regla_id, local_comision_modalidad, local_comision_valor, local_comision_monto,
          driver_comision_regla_id, driver_comision_valor, driver_comision_monto
        ) VALUES (
          ${spId}, ${pedidoId}, ${g.restaurante_id}, 'NORMAL', 'PENDIENTE', ${g.subtotal},
          ${g.costo_envio}, ${g.distancia_km},
          ${JSON.stringify(dirSnapshot)}::jsonb,
          ${g.local_rule?.id ?? null}, ${g.local_rule?.modalidad ?? 'FIJA'},
          ${Number(g.local_rule?.valor ?? 0)}, ${g.local_commission_amount},
          ${g.driver_rule?.id ?? null}, ${Number(g.driver_rule?.valor ?? 0)}, ${g.driver_commission_amount}
        )
      `)

      // Items con sus opciones
      for (const item of g.items) {
        const itemId = randomUUID()
        transactionQueries.push(sql`
          INSERT INTO pedido_items (
            id, sub_pedido_id, plato_id, nombre_snapshot, precio_snapshot,
            cantidad, subtotal, notas
          ) VALUES (
            ${itemId}, ${spId}, ${item.plato_id}, ${item.nombre_snapshot},
            ${item.precio_snapshot}, ${item.cantidad}, ${item.subtotal},
            ${item.notas || null}
          )
        `)

        // Opciones
        for (const op of item.opciones) {
          transactionQueries.push(sql`
            INSERT INTO item_opciones (
              item_id, grupo_titulo_snapshot,
              choice_nombre_snapshot, precio_extra
            ) VALUES (
              ${itemId}, ${op.grupo_titulo},
              ${op.choice_nombre}, ${op.precio_extra}
            )
          `)
        }
      }

      // Historial inicial
      transactionQueries.push(sql`
        INSERT INTO pedido_estado_historial (
          sub_pedido_id, estado, cambiado_por, notas
        ) VALUES (
          ${spId}, 'PENDIENTE', ${user.id}, 'Pedido recibido'
        )
      `)
    }

    await sql.transaction(transactionQueries)
    await Promise.all(createdSubOrderIds.map((subOrderId) => notifyInternalPush('NEW_ORDER', subOrderId)))

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

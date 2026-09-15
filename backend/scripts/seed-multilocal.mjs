// ============================================================
// SEED MULTI-LOCAL — FoodXpres
// Crea pedidos con 2-3 locales para probar esa lógica
// Ejecutar desde la raíz: node backend/scripts/seed-multilocal.mjs
// ============================================================
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

try {
  const envPath = resolve(__dirname, '../../apps/web-admin/.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split(/\r?\n/).forEach((line) => {
    const clean = line.replace(/\r$/, '').trim()
    if (!clean || clean.startsWith('#')) return
    const idx = clean.indexOf('=')
    if (idx === -1) return
    const key = clean.slice(0, idx).trim()
    let value = clean.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
  console.log('✅ .env.local cargado\n')
} catch (e) {
  console.warn('⚠️  No se pudo leer .env.local\n')
}

const sql = neon(process.env.DATABASE_URL)

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function codigo() {
  return 'P-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function seed() {
  console.log('🌱 Creando pedidos multi-local...\n')

  // Traer datos base
  const clientes = await sql`
    SELECT id, nombre FROM usuarios WHERE role = 'CUSTOMER' LIMIT 20
  `
  const restaurantes = await sql`
    SELECT id, nombre FROM restaurantes WHERE activo = TRUE
  `
  const drivers = await sql`
    SELECT id, nombre FROM usuarios WHERE role = 'DRIVER' AND activo = TRUE
  `

  if (clientes.length === 0 || restaurantes.length < 2) {
    console.error('❌ Necesitas al menos 2 restaurantes y clientes en la BD')
    process.exit(1)
  }

  console.log(`📊 Datos disponibles: ${clientes.length} clientes, ${restaurantes.length} restaurantes, ${drivers.length} drivers\n`)

  // Crear 10 pedidos multi-local
  const pedidosCreados = []

  for (let i = 0; i < 10; i++) {
    const cliente = pick(clientes)
    const numLocales = rand(2, 3)
    const localesElegidos = pickN(restaurantes, numLocales)

    // Fecha aleatoria (últimos 7 días)
    const diasAtras = rand(0, 7)
    const horasAtras = rand(0, 23)
    const creadoEn = new Date()
    creadoEn.setDate(creadoEn.getDate() - diasAtras)
    creadoEn.setHours(creadoEn.getHours() - horasAtras)

    // Estado general del pedido padre
    const estadoGeneral = pick(['PENDIENTE', 'ACEPTADO', 'EN_CAMINO', 'ENTREGADO', 'ENTREGADO'])

    // 1. Crear pedido PADRE (temporal con totales en 0, los actualizamos después)
    const pedidoRows = await sql`
      INSERT INTO pedidos (
        codigo, usuario_id, subtotal, total_envio, propina, vip, costo_vip, total,
        notas, estado_global, creado_en, actualizado_en
      ) VALUES (
        ${codigo()}, ${cliente.id}, 0, 0, 0, false, 0, 0,
        ${pick(['Pedido grande para la familia', 'Tocar timbre 2 veces', null, null])},
        ${estadoGeneral},
        ${creadoEn.toISOString()},
        ${creadoEn.toISOString()}
      )
      RETURNING id, codigo
    `
    const pedidoId = pedidoRows[0].id
    const pedidoCodigo = pedidoRows[0].codigo

    // 2. Por cada local, crear un sub_pedido con sus items
    let subtotalTotal = 0
    let envioTotal = 0
    let numItemsTotal = 0

    const localesDetalle = []

    for (const local of localesElegidos) {
      // Platos de este local
      const platos = await sql`
        SELECT id, nombre, precio FROM platos 
        WHERE restaurante_id = ${local.id} AND disponible = TRUE
      `
      if (platos.length === 0) continue

      const numItems = rand(1, 3)
      const itemsLocales = []
      let subtotalLocal = 0

      for (let j = 0; j < numItems; j++) {
        const plato = pick(platos)
        const cant = rand(1, 2)
        const sub = Number(plato.precio) * cant
        itemsLocales.push({ plato, cant, sub })
        subtotalLocal += sub
      }

      const envioLocal = rand(4, 12)
      subtotalTotal += subtotalLocal
      envioTotal += envioLocal
      numItemsTotal += itemsLocales.length

      // Estado por local (cada uno independiente)
      const estadoLocal = pick([
        estadoGeneral,
        estadoGeneral,
        'ENTREGADO',
        'EN_CAMINO',
        'LISTO',
      ])

      // Timestamps según estado
      const aceptadoEn = ['ACEPTADO', 'LISTO', 'EN_CAMINO', 'ENTREGADO'].includes(estadoLocal)
        ? new Date(creadoEn.getTime() + 2 * 60000)
        : null
      const listoEn = ['LISTO', 'EN_CAMINO', 'ENTREGADO'].includes(estadoLocal)
        ? new Date(creadoEn.getTime() + rand(15, 25) * 60000)
        : null
      const recogidoEn = ['EN_CAMINO', 'ENTREGADO'].includes(estadoLocal)
        ? new Date(creadoEn.getTime() + rand(26, 35) * 60000)
        : null
      const entregadoEn = estadoLocal === 'ENTREGADO'
        ? new Date(creadoEn.getTime() + rand(36, 55) * 60000)
        : null

      // Driver solo si está en camino o entregado
      const driver = ['EN_CAMINO', 'ENTREGADO'].includes(estadoLocal) && drivers.length > 0
        ? pick(drivers)
        : null

      // Dirección snapshot
      const dirSnapshot = {
        etiqueta: 'Casa',
        direccion: pick([
          'Jr. Raimondi 123, Pucallpa',
          'Av. San Martín 456, Pucallpa',
          'Jr. Ucayali 789, Pucallpa',
        ]),
        referencia: 'Portón verde',
        lat: -8.38 + (Math.random() - 0.5) * 0.02,
        lng: -74.55 + (Math.random() - 0.5) * 0.02,
      }

      const spRows = await sql`
        INSERT INTO sub_pedidos (
          pedido_id, restaurante_id, driver_id, estado, subtotal, costo_envio,
          distancia_km, tiempo_estimado, direccion_snapshot,
          creado_en, aceptado_en, listo_en, recogido_en, entregado_en
        ) VALUES (
          ${pedidoId}, ${local.id}, ${driver?.id || null}, ${estadoLocal},
          ${subtotalLocal}, ${envioLocal}, ${rand(1, 5) + Math.random()}, ${rand(15, 40)},
          ${JSON.stringify(dirSnapshot)}::jsonb,
          ${creadoEn.toISOString()},
          ${aceptadoEn ? aceptadoEn.toISOString() : null},
          ${listoEn ? listoEn.toISOString() : null},
          ${recogidoEn ? recogidoEn.toISOString() : null},
          ${entregadoEn ? entregadoEn.toISOString() : null}
        )
        RETURNING id
      `
      const spId = spRows[0].id

      // Items
      for (const it of itemsLocales) {
        await sql`
          INSERT INTO pedido_items (
            sub_pedido_id, plato_id, nombre_snapshot, precio_snapshot, cantidad, subtotal
          ) VALUES (
            ${spId}, ${it.plato.id}, ${it.plato.nombre}, ${it.plato.precio}, ${it.cant}, ${it.sub}
          )
        `
      }

      // Historial básico
      await sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, notas, creado_en)
        VALUES (${spId}, 'PENDIENTE', 'Pedido recibido', ${creadoEn.toISOString()})
      `
      if (aceptadoEn) {
        await sql`
          INSERT INTO pedido_estado_historial (sub_pedido_id, estado, notas, creado_en)
          VALUES (${spId}, 'ACEPTADO', 'Aceptado por el local', ${aceptadoEn.toISOString()})
        `
      }

      localesDetalle.push({ nombre: local.nombre, items: itemsLocales.length, envio: envioLocal })
    }

    // 3. Actualizar pedido PADRE con totales reales
    const propina = Math.random() > 0.7 ? rand(2, 8) : 0
    const vip = Math.random() > 0.9
    const costoVip = vip ? 2.30 : 0
    const total = subtotalTotal + envioTotal + propina + costoVip

    await sql`
      UPDATE pedidos SET
        subtotal = ${subtotalTotal},
        total_envio = ${envioTotal},
        propina = ${propina},
        vip = ${vip},
        costo_vip = ${costoVip},
        total = ${total}
      WHERE id = ${pedidoId}
    `

    pedidosCreados.push({
      codigo: pedidoCodigo,
      locales: localesDetalle,
      total,
    })

    console.log(`   ✅ ${pedidoCodigo} · ${numLocales} locales · S/ ${total.toFixed(2)}`)
    for (const l of localesDetalle) {
      console.log(`      - ${l.nombre} (${l.items} items, envío S/ ${l.envio})`)
    }
  }

  // ==========================================================
  // RESUMEN
  // ==========================================================
  console.log('\n🎉 MULTI-LOCAL COMPLETADO\n')
  console.log('═══════════════════════════════════════════════')
  console.log(`  ${pedidosCreados.length} pedidos multi-local creados`)
  console.log(`  Total items: ${pedidosCreados.reduce((s, p) => s + p.locales.reduce((ss, l) => ss + l.items, 0), 0)}`)
  console.log('═══════════════════════════════════════════════\n')

  // Verificación final
  const verificacion = await sql`
    SELECT 
      p.codigo,
      COUNT(DISTINCT sp.id)::int as num_subpedidos,
      COUNT(DISTINCT sp.restaurante_id)::int as num_locales,
      COUNT(pi.id)::int as num_items,
      p.total
    FROM pedidos p
    INNER JOIN sub_pedidos sp ON sp.pedido_id = p.id
    LEFT JOIN pedido_items pi ON pi.sub_pedido_id = sp.id
    GROUP BY p.id, p.codigo, p.total
    HAVING COUNT(DISTINCT sp.id) > 1
    ORDER BY p.creado_en DESC
    LIMIT 15
  `

  console.log('📊 Pedidos multi-local en la BD:')
  console.table(verificacion)
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
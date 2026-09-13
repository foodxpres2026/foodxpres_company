// ============================================================
// SEED — FoodXpres
// Ejecutar desde la raíz: node backend/scripts/seed.mjs
// ============================================================
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer .env.local de web-admin
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

// ============================================================
// HELPERS
// ============================================================
async function hash(pass) {
  return bcrypt.hash(pass, 10)
}

async function upsertUser({ role, email, celular, password, nombre }) {
  const password_hash = await hash(password)

  if (email) {
    const existing = await sql`SELECT id FROM usuarios WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) return existing[0].id
    const rows = await sql`
      INSERT INTO usuarios (role, email, password_hash, nombre)
      VALUES (${role}, ${email}, ${password_hash}, ${nombre})
      RETURNING id
    `
    return rows[0].id
  }

  const existing = await sql`SELECT id FROM usuarios WHERE celular = ${celular} LIMIT 1`
  if (existing.length > 0) return existing[0].id
  const rows = await sql`
    INSERT INTO usuarios (role, celular, password_hash, nombre)
    VALUES (${role}, ${celular}, ${password_hash}, ${nombre})
    RETURNING id
  `
  return rows[0].id
}

// ============================================================
// SEED PRINCIPAL
// ============================================================
async function seed() {
  console.log('🌱 Iniciando seed de FoodXpres...\n')

  // --------------------------------------------------------
  // 1. ADMINS
  // --------------------------------------------------------
  await upsertUser({
    role: 'ADMIN',
    email: 'admin1@foodxpres.pe',
    password: 'admin123',
    nombre: 'Admin Principal',
  })
  await upsertUser({
    role: 'ADMIN',
    email: 'admin2@foodxpres.pe',
    password: 'admin123',
    nombre: 'Admin Secundario',
  })
  console.log('✅ 2 admins creados (admin1@foodxpres.pe / admin2@foodxpres.pe · pass: admin123)')

  // --------------------------------------------------------
  // 2. CATEGORÍAS GLOBALES
  // --------------------------------------------------------
  const cats = [
    { slug: 'hamburguesas', nombre: 'Hamburguesas', emoji: '🍔' },
    { slug: 'pizzas',       nombre: 'Pizzas',       emoji: '🍕' },
    { slug: 'alitas',       nombre: 'Alitas',       emoji: '🍗' },
    { slug: 'tacos',        nombre: 'Tacos',        emoji: '🌮' },
    { slug: 'chifa',        nombre: 'Chifa',        emoji: '🍜' },
    { slug: 'pollo',        nombre: 'Pollo a la brasa', emoji: '🍗' },
    { slug: 'sushi',        nombre: 'Sushi',        emoji: '🍣' },
    { slug: 'bebidas',      nombre: 'Bebidas',      emoji: '🥤' },
    { slug: 'postres',      nombre: 'Postres',      emoji: '🍰' },
    { slug: 'saludable',    nombre: 'Saludable',    emoji: '🥗' },
  ]
  for (let i = 0; i < cats.length; i++) {
    await sql`
      INSERT INTO categorias (slug, nombre, emoji, orden)
      VALUES (${cats[i].slug}, ${cats[i].nombre}, ${cats[i].emoji}, ${i})
      ON CONFLICT (slug) DO NOTHING
    `
  }
  console.log(`✅ ${cats.length} categorías creadas`)

  // --------------------------------------------------------
  // 3. RESTAURANTE 1: LA BURGUESÍA (Hamburguesas)
  // --------------------------------------------------------
  const staff1Id = await upsertUser({
    role: 'STAFF',
    celular: '910000001',
    password: 'local123',
    nombre: 'La Burguesía',
  })

  const rest1 = await sql`
    INSERT INTO restaurantes (
      usuario_id, slug, nombre, subtitulo, direccion_fisica, referencia,
      lat, lng, celular, tiempo_estimado, monto_minimo, activo,
      logo_url, banner_url
    ) VALUES (
      ${staff1Id}, 'la-burguesia', 'La Burguesía', 'Hamburguesas artesanales',
      'Jr. Tarapacá 456, Pucallpa', 'Frente a la Plaza de Armas',
      -8.3791, -74.5539, '910000001', '25-35 min', 15.00, TRUE,
      NULL, NULL
    ) ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `
  let rest1Id = rest1[0]?.id
  if (!rest1Id) {
    const exist = await sql`SELECT id FROM restaurantes WHERE slug = 'la-burguesia'`
    rest1Id = exist[0].id
  }

  // Horarios (L-D 12:00 a 23:00, domingo cerrado)
  const dias = ['lun','mar','mie','jue','vie','sab','dom']
  for (const dia of dias) {
    const cerrado = dia === 'dom'
    await sql`
      INSERT INTO horarios_atencion (restaurante_id, dia, hora_apertura, hora_cierre)
      VALUES (${rest1Id}, ${dia}, ${cerrado ? null : '12:00'}, ${cerrado ? null : '23:00'})
      ON CONFLICT (restaurante_id, dia) DO NOTHING
    `
  }

  // Categorías: hamburguesas + bebidas
  const catBurger = await sql`SELECT id FROM categorias WHERE slug = 'hamburguesas'`
  const catBebidas = await sql`SELECT id FROM categorias WHERE slug = 'bebidas'`
  await sql`
    INSERT INTO restaurantes_categorias (restaurante_id, categoria_id)
    VALUES (${rest1Id}, ${catBurger[0].id}), (${rest1Id}, ${catBebidas[0].id})
    ON CONFLICT DO NOTHING
  `

  // Subcategorías
  const subBurger = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest1Id}, 'Hamburguesas', 0)
    RETURNING id
  `
  const subBebidas1 = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest1Id}, 'Bebidas', 1)
    RETURNING id
  `

  // Platos
  const platos1 = [
    { nombre: 'Hamburguesa Clásica', desc: 'Carne 150g, queso cheddar, lechuga, tomate', precio: 18, tiempo: 15, sub: subBurger[0].id },
    { nombre: 'Hamburguesa Doble', desc: 'Doble carne, doble queso, tocino', precio: 25, tiempo: 18, sub: subBurger[0].id },
    { nombre: 'Hamburguesa BBQ', desc: 'Carne 150g, salsa BBQ, aros de cebolla', precio: 20, tiempo: 15, sub: subBurger[0].id },
    { nombre: 'Coca Cola 500ml', desc: 'Gaseosa helada', precio: 5, tiempo: 2, sub: subBebidas1[0].id },
    { nombre: 'Inca Kola 500ml', desc: 'Gaseosa helada', precio: 5, tiempo: 2, sub: subBebidas1[0].id },
    { nombre: 'Limonada Frozen', desc: 'Limonada natural con hielo', precio: 7, tiempo: 5, sub: subBebidas1[0].id },
  ]

  for (let i = 0; i < platos1.length; i++) {
    const p = platos1[i]
    await sql`
      INSERT INTO platos (restaurante_id, subcategoria_id, nombre, descripcion, precio, tiempo_estimado, orden)
      VALUES (${rest1Id}, ${p.sub}, ${p.nombre}, ${p.desc}, ${p.precio}, ${p.tiempo}, ${i})
    `
  }

  // Grupo de opciones en Hamburguesa Clásica (punto de cocción)
  const burgerClasica = await sql`
    SELECT id FROM platos WHERE restaurante_id = ${rest1Id} AND nombre = 'Hamburguesa Clásica' LIMIT 1
  `
  const grupoCoccion = await sql`
    INSERT INTO grupos_opciones (plato_id, titulo, requerido, minimo, maximo, orden)
    VALUES (${burgerClasica[0].id}, 'Punto de cocción', TRUE, 1, 1, 0)
    RETURNING id
  `
  for (let i = 0; i < 3; i++) {
    const nombres = ['Término medio', 'Tres cuartos', 'Bien cocido']
    await sql`
      INSERT INTO opciones_choices (grupo_id, nombre, orden)
      VALUES (${grupoCoccion[0].id}, ${nombres[i]}, ${i})
    `
  }

  console.log('✅ Restaurante 1: La Burguesía (6 platos + opciones)')

  // --------------------------------------------------------
  // 4. RESTAURANTE 2: ALITAS LOCO (Alitas)
  // --------------------------------------------------------
  const staff2Id = await upsertUser({
    role: 'STAFF',
    celular: '910000002',
    password: 'local123',
    nombre: 'Alitas Loco',
  })

  const rest2 = await sql`
    INSERT INTO restaurantes (
      usuario_id, slug, nombre, subtitulo, direccion_fisica,
      lat, lng, celular, tiempo_estimado, monto_minimo, activo
    ) VALUES (
      ${staff2Id}, 'alitas-loco', 'Alitas Loco', 'Las mejores alitas de Pucallpa',
      'Av. Centenario 789, Pucallpa',
      -8.3821, -74.5487, '910000002', '30-40 min', 20.00, TRUE
    ) ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `
  let rest2Id = rest2[0]?.id
  if (!rest2Id) {
    const exist = await sql`SELECT id FROM restaurantes WHERE slug = 'alitas-loco'`
    rest2Id = exist[0].id
  }

  for (const dia of dias) {
    await sql`
      INSERT INTO horarios_atencion (restaurante_id, dia, hora_apertura, hora_cierre)
      VALUES (${rest2Id}, ${dia}, '17:00', '01:00')
      ON CONFLICT (restaurante_id, dia) DO NOTHING
    `
  }

  const catAlitas = await sql`SELECT id FROM categorias WHERE slug = 'alitas'`
  await sql`
    INSERT INTO restaurantes_categorias (restaurante_id, categoria_id)
    VALUES (${rest2Id}, ${catAlitas[0].id})
    ON CONFLICT DO NOTHING
  `

  const subAlitas = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest2Id}, 'Alitas', 0) RETURNING id
  `
  const subBebidas2 = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest2Id}, 'Bebidas', 1) RETURNING id
  `

  const platos2 = [
    { nombre: 'Alitas BBQ (8 und)', desc: 'Alitas bañadas en salsa BBQ', precio: 22, tiempo: 20, sub: subAlitas[0].id },
    { nombre: 'Alitas Buffalo (8 und)', desc: 'Alitas picantes estilo Buffalo', precio: 22, tiempo: 20, sub: subAlitas[0].id },
    { nombre: 'Alitas Acevichadas (8 und)', desc: 'Alitas con salsa acevichada', precio: 24, tiempo: 20, sub: subAlitas[0].id },
    { nombre: 'Chicha Morada 1L', desc: 'Chicha morada casera', precio: 8, tiempo: 3, sub: subBebidas2[0].id },
    { nombre: 'Cerveza Cusqueña', desc: 'Botella 650ml', precio: 15, tiempo: 2, sub: subBebidas2[0].id },
  ]

  for (let i = 0; i < platos2.length; i++) {
    const p = platos2[i]
    await sql`
      INSERT INTO platos (restaurante_id, subcategoria_id, nombre, descripcion, precio, tiempo_estimado, orden)
      VALUES (${rest2Id}, ${p.sub}, ${p.nombre}, ${p.desc}, ${p.precio}, ${p.tiempo}, ${i})
    `
  }

  // Grupo de sabores en cada plato de alitas
  const alitasPlatos = await sql`
    SELECT id, nombre FROM platos 
    WHERE restaurante_id = ${rest2Id} AND nombre LIKE 'Alitas%'
  `
  for (const p of alitasPlatos) {
    const grupo = await sql`
      INSERT INTO grupos_opciones (plato_id, titulo, requerido, minimo, maximo, orden)
      VALUES (${p.id}, 'Elige tu salsa', TRUE, 1, 1, 0)
      RETURNING id
    `
    const salsas = ['BBQ', 'Buffalo', 'Acevichada', 'Maracuyá']
    for (let i = 0; i < salsas.length; i++) {
      await sql`
        INSERT INTO opciones_choices (grupo_id, nombre, orden)
        VALUES (${grupo[0].id}, ${salsas[i]}, ${i})
      `
    }
  }

  console.log('✅ Restaurante 2: Alitas Loco (5 platos + opciones obligatorias)')

  // --------------------------------------------------------
  // 5. RESTAURANTE 3: CHIFA DRAGÓN (Chifa)
  // --------------------------------------------------------
  const staff3Id = await upsertUser({
    role: 'STAFF',
    celular: '910000003',
    password: 'local123',
    nombre: 'Chifa Dragón',
  })

  const rest3 = await sql`
    INSERT INTO restaurantes (
      usuario_id, slug, nombre, subtitulo, direccion_fisica,
      lat, lng, celular, tiempo_estimado, monto_minimo, activo
    ) VALUES (
      ${staff3Id}, 'chifa-dragon', 'Chifa Dragón', 'Chifa al wok',
      'Jr. Agustín Cauper 234, Pucallpa',
      -8.3765, -74.5510, '910000003', '35-45 min', 25.00, TRUE
    ) ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `
  let rest3Id = rest3[0]?.id
  if (!rest3Id) {
    const exist = await sql`SELECT id FROM restaurantes WHERE slug = 'chifa-dragon'`
    rest3Id = exist[0].id
  }

  for (const dia of dias) {
    const cerrado = dia === 'lun'
    await sql`
      INSERT INTO horarios_atencion (restaurante_id, dia, hora_apertura, hora_cierre)
      VALUES (${rest3Id}, ${dia}, ${cerrado ? null : '11:00'}, ${cerrado ? null : '22:00'})
      ON CONFLICT (restaurante_id, dia) DO NOTHING
    `
  }

  const catChifa = await sql`SELECT id FROM categorias WHERE slug = 'chifa'`
  await sql`
    INSERT INTO restaurantes_categorias (restaurante_id, categoria_id)
    VALUES (${rest3Id}, ${catChifa[0].id})
    ON CONFLICT DO NOTHING
  `

  const subMenu = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest3Id}, 'Menús', 0) RETURNING id
  `
  const subPlatos = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest3Id}, 'Platos a la carta', 1) RETURNING id
  `
  const subBebidas3 = await sql`
    INSERT INTO subcategorias (restaurante_id, nombre, orden)
    VALUES (${rest3Id}, 'Bebidas', 2) RETURNING id
  `

  const platos3 = [
    { nombre: 'Menú del día', desc: 'Entrada + plato de fondo + refresco', precio: 15, tiempo: 15, sub: subMenu[0].id },
    { nombre: 'Arroz Chaufa Especial', desc: 'Con pollo, chancho y tortilla', precio: 22, tiempo: 15, sub: subPlatos[0].id },
    { nombre: 'Tallarín Saltado', desc: 'Tallarín con verduras y carne', precio: 20, tiempo: 15, sub: subPlatos[0].id },
    { nombre: 'Wantán Frito (8 und)', desc: 'Wantanes crujientes', precio: 12, tiempo: 10, sub: subPlatos[0].id },
    { nombre: 'Inca Kola 1L', desc: 'Gaseosa', precio: 8, tiempo: 2, sub: subBebidas3[0].id },
  ]

  for (let i = 0; i < platos3.length; i++) {
    const p = platos3[i]
    await sql`
      INSERT INTO platos (restaurante_id, subcategoria_id, nombre, descripcion, precio, tiempo_estimado, orden)
      VALUES (${rest3Id}, ${p.sub}, ${p.nombre}, ${p.desc}, ${p.precio}, ${p.tiempo}, ${i})
    `
  }

  // Grupo de opciones en Menú del día (entrada obligatoria)
  const menuDia = await sql`
    SELECT id FROM platos WHERE restaurante_id = ${rest3Id} AND nombre = 'Menú del día' LIMIT 1
  `
  const grupoEntrada = await sql`
    INSERT INTO grupos_opciones (plato_id, titulo, requerido, minimo, maximo, orden)
    VALUES (${menuDia[0].id}, 'Elige tu entrada', TRUE, 1, 1, 0)
    RETURNING id
  `
  const entradas = ['Sopa wantán', 'Huancaína', 'Sapo', 'Ensalada']
  for (let i = 0; i < entradas.length; i++) {
    await sql`
      INSERT INTO opciones_choices (grupo_id, nombre, orden)
      VALUES (${grupoEntrada[0].id}, ${entradas[i]}, ${i})
    `
  }

  console.log('✅ Restaurante 3: Chifa Dragón (5 platos + entrada obligatoria)')

  // --------------------------------------------------------
  // 6. CLIENTE DE PRUEBA
  // --------------------------------------------------------
  const clienteId = await upsertUser({
    role: 'CUSTOMER',
    celular: '999999999',
    password: 'cliente123',
    nombre: 'Cliente de Prueba',
  })

  // Dirección de prueba
  const dirExist = await sql`
    SELECT id FROM direcciones WHERE usuario_id = ${clienteId} LIMIT 1
  `
  if (dirExist.length === 0) {
    await sql`
      INSERT INTO direcciones (usuario_id, etiqueta, direccion, referencia, lat, lng, es_predeterminada)
      VALUES (
        ${clienteId}, 'Casa', 'Jr. Raimondi 123, Pucallpa',
        'Portón verde, tocar timbre 2 veces', -8.3800, -74.5540, TRUE
      )
    `
  }
  console.log('✅ Cliente de prueba (999999999 / cliente123)')

  // --------------------------------------------------------
  // 7. DRIVER DE PRUEBA
  // --------------------------------------------------------
  const driverId = await upsertUser({
    role: 'DRIVER',
    celular: '988888888',
    password: 'driver123',
    nombre: 'Carlos Repartidor',
  })

  const driverDetExist = await sql`
    SELECT usuario_id FROM driver_detalles WHERE usuario_id = ${driverId} LIMIT 1
  `
  if (driverDetExist.length === 0) {
    await sql`
      INSERT INTO driver_detalles (usuario_id, vehiculo, placa, licencia, disponible)
      VALUES (${driverId}, 'Moto Honda 150', 'P-123456', 'Q12345678', TRUE)
    `
  }
  console.log('✅ Driver de prueba (988888888 / driver123)')

  // --------------------------------------------------------
  // RESUMEN
  // --------------------------------------------------------
  console.log('\n🎉 SEED COMPLETADO\n')
  console.log('═══════════════════════════════════════════════')
  console.log('  CREDENCIALES DE PRUEBA')
  console.log('═══════════════════════════════════════════════')
  console.log('  ADMIN 1:  admin1@foodxpres.pe / admin123')
  console.log('  ADMIN 2:  admin2@foodxpres.pe / admin123')
  console.log('  LOCAL 1:  910000001 / local123 (La Burguesía)')
  console.log('  LOCAL 2:  910000002 / local123 (Alitas Loco)')
  console.log('  LOCAL 3:  910000003 / local123 (Chifa Dragón)')
  console.log('  CLIENTE:  999999999 / cliente123')
  console.log('  DRIVER:   988888888 / driver123')
  console.log('═══════════════════════════════════════════════\n')
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
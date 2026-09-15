// ============================================================
// SEED MASIVO — FoodXpres
// Ejecutar desde la raíz: node backend/scripts/seed-masivo.mjs
// Crea: 5 restaurantes + 40 platos + 20 clientes + 10 drivers + 50 pedidos
// ============================================================
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar .env.local
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
const HASH = await bcrypt.hash('123456', 10)

// ============================================================
// HELPERS
// ============================================================
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function codigo() {
  return 'P-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const RESTAURANTES = [
  {
    slug: 'la-burguesia',
    nombre: 'La Burguesía',
    subtitulo: 'Hamburguesas artesanales',
    direccion: 'Jr. Tarapacá 456, Pucallpa',
    referencia: 'Frente a la Plaza de Armas',
    lat: -8.3791,
    lng: -74.5539,
    celular: '910000001',
    tiempo: '25-35 min',
    min: 15,
    banner: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80',
    categorias: ['hamburguesas', 'bebidas'],
    subcategorias: ['Hamburguesas', 'Acompañamientos', 'Bebidas', 'Postres'],
    platos: [
      { nombre: 'Hamburguesa Clásica', desc: 'Carne 150g, queso cheddar, lechuga, tomate', precio: 18, tiempo: 15, sub: 'Hamburguesas', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', opciones: { titulo: 'Punto de cocción', requerido: true, min: 1, max: 1, choices: ['Término medio', 'Tres cuartos', 'Bien cocido'] } },
      { nombre: 'Hamburguesa Doble', desc: 'Doble carne, doble queso, tocino', precio: 25, tiempo: 18, sub: 'Hamburguesas', img: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&q=80' },
      { nombre: 'Hamburguesa BBQ', desc: 'Carne 150g, salsa BBQ, aros de cebolla', precio: 20, tiempo: 15, sub: 'Hamburguesas', img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=600&q=80' },
      { nombre: 'Hamburguesa Vegetariana', desc: 'Medallón de quinua, palta, tomate', precio: 19, tiempo: 15, sub: 'Hamburguesas', img: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80' },
      { nombre: 'Papas Fritas', desc: 'Porción grande de papas crujientes', precio: 8, tiempo: 10, sub: 'Acompañamientos', img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80' },
      { nombre: 'Aros de Cebolla', desc: '10 aros empanizados', precio: 10, tiempo: 10, sub: 'Acompañamientos', img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&q=80' },
      { nombre: 'Coca Cola 500ml', desc: 'Gaseosa helada', precio: 5, tiempo: 2, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80' },
      { nombre: 'Limonada Frozen', desc: 'Limonada natural con hielo', precio: 7, tiempo: 5, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80' },
    ],
  },
  {
    slug: 'alitas-loco',
    nombre: 'Alitas Loco',
    subtitulo: 'Las mejores alitas de Pucallpa',
    direccion: 'Av. Centenario 789, Pucallpa',
    referencia: 'Al lado del grifo',
    lat: -8.3821,
    lng: -74.5487,
    celular: '910000002',
    tiempo: '30-40 min',
    min: 20,
    banner: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&q=80',
    categorias: ['alitas', 'bebidas'],
    subcategorias: ['Alitas', 'Broaster', 'Bebidas', 'Cervezas'],
    platos: [
      { nombre: 'Alitas BBQ (8 und)', desc: 'Alitas bañadas en salsa BBQ', precio: 22, tiempo: 20, sub: 'Alitas', img: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=600&q=80', opciones: { titulo: 'Elige tu salsa', requerido: true, min: 1, max: 1, choices: ['BBQ', 'Buffalo', 'Acevichada', 'Maracuyá'] } },
      { nombre: 'Alitas Buffalo (8 und)', desc: 'Alitas picantes estilo Buffalo', precio: 22, tiempo: 20, sub: 'Alitas', img: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80', opciones: { titulo: 'Elige tu salsa', requerido: true, min: 1, max: 1, choices: ['BBQ', 'Buffalo', 'Acevichada', 'Maracuyá'] } },
      { nombre: 'Alitas Acevichadas (8 und)', desc: 'Alitas con salsa acevichada', precio: 24, tiempo: 20, sub: 'Alitas', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=600&q=80', opciones: { titulo: 'Elige tu salsa', requerido: true, min: 1, max: 1, choices: ['BBQ', 'Buffalo', 'Acevichada', 'Maracuyá'] } },
      { nombre: 'Alitas Mixtas (12 und)', desc: '3 sabores a elección', precio: 32, tiempo: 25, sub: 'Alitas', img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80', opciones: { titulo: 'Elige 3 sabores', requerido: true, min: 3, max: 3, choices: ['BBQ', 'Buffalo', 'Acevichada', 'Maracuyá', 'Teriyaki'] } },
      { nombre: 'Broaster Personal', desc: 'Pierna + papas + ensalada', precio: 18, tiempo: 18, sub: 'Broaster', img: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=600&q=80' },
      { nombre: 'Chicha Morada 1L', desc: 'Chicha morada casera', precio: 8, tiempo: 3, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80' },
      { nombre: 'Cerveza Cusqueña', desc: 'Botella 650ml', precio: 15, tiempo: 2, sub: 'Cervezas', img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80' },
      { nombre: 'Cerveza Pilsen', desc: 'Botella 650ml', precio: 14, tiempo: 2, sub: 'Cervezas', img: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=600&q=80' },
    ],
  },
  {
    slug: 'chifa-dragon',
    nombre: 'Chifa Dragón',
    subtitulo: 'Chifa al wok',
    direccion: 'Jr. Agustín Cauper 234, Pucallpa',
    referencia: 'A 2 cuadras del mercado',
    lat: -8.3765,
    lng: -74.551,
    celular: '910000003',
    tiempo: '35-45 min',
    min: 25,
    banner: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=200&q=80',
    categorias: ['chifa'],
    subcategorias: ['Menús', 'Platos a la carta', 'Entradas', 'Bebidas'],
    platos: [
      { nombre: 'Menú del día', desc: 'Entrada + plato de fondo + refresco', precio: 15, tiempo: 15, sub: 'Menús', img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80', opciones: { titulo: 'Elige tu entrada', requerido: true, min: 1, max: 1, choices: ['Sopa wantán', 'Huancaína', 'Sapo', 'Ensalada'] } },
      { nombre: 'Arroz Chaufa Especial', desc: 'Con pollo, chancho y tortilla', precio: 22, tiempo: 15, sub: 'Platos a la carta', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80' },
      { nombre: 'Tallarín Saltado', desc: 'Tallarín con verduras y carne', precio: 20, tiempo: 15, sub: 'Platos a la carta', img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80' },
      { nombre: 'Arroz con Pollo', desc: 'Arroz verde con pollo', precio: 18, tiempo: 12, sub: 'Platos a la carta', img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80' },
      { nombre: 'Wantán Frito (8 und)', desc: 'Wantanes crujientes', precio: 12, tiempo: 10, sub: 'Entradas', img: 'https://images.unsplash.com/photo-1625938145312-c18f4de0b6ae?w=600&q=80' },
      { nombre: 'Sopa Wantán', desc: 'Sopa con wantanes y verduras', precio: 10, tiempo: 10, sub: 'Entradas', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80' },
      { nombre: 'Inca Kola 1L', desc: 'Gaseosa', precio: 8, tiempo: 2, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&q=80' },
      { nombre: 'Té Helado', desc: 'Vaso grande', precio: 5, tiempo: 2, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=600&q=80' },
    ],
  },
  {
    slug: 'pizzeria-napoli',
    nombre: 'Pizzería Napoli',
    subtitulo: 'Pizzas artesanales al horno',
    direccion: 'Jr. Progreso 567, Pucallpa',
    referencia: 'Cerca al parque',
    lat: -8.3805,
    lng: -74.556,
    celular: '910000004',
    tiempo: '30-40 min',
    min: 20,
    banner: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80',
    categorias: ['pizzas', 'bebidas'],
    subcategorias: ['Pizzas', 'Calzone', 'Bebidas', 'Postres'],
    platos: [
      { nombre: 'Pizza Margarita', desc: 'Salsa de tomate, mozzarella, albahaca', precio: 25, tiempo: 20, sub: 'Pizzas', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80', opciones: { titulo: 'Tamaño', requerido: true, min: 1, max: 1, choices: ['Personal', 'Mediana', 'Familiar'] } },
      { nombre: 'Pizza Pepperoni', desc: 'Mozzarella y pepperoni', precio: 30, tiempo: 20, sub: 'Pizzas', img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80', opciones: { titulo: 'Tamaño', requerido: true, min: 1, max: 1, choices: ['Personal', 'Mediana', 'Familiar'] } },
      { nombre: 'Pizza Hawaiana', desc: 'Jamón, piña, mozzarella', precio: 28, tiempo: 20, sub: 'Pizzas', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', opciones: { titulo: 'Tamaño', requerido: true, min: 1, max: 1, choices: ['Personal', 'Mediana', 'Familiar'] } },
      { nombre: 'Pizza Cuatro Quesos', desc: 'Mozzarella, parmesano, azul, cheddar', precio: 32, tiempo: 20, sub: 'Pizzas', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', opciones: { titulo: 'Tamaño', requerido: true, min: 1, max: 1, choices: ['Personal', 'Mediana', 'Familiar'] } },
      { nombre: 'Calzone Napolitano', desc: 'Empanada de pizza rellena', precio: 22, tiempo: 20, sub: 'Calzone', img: 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600&q=80' },
      { nombre: 'Coca Cola 1.5L', desc: 'Gaseosa', precio: 9, tiempo: 2, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&q=80' },
      { nombre: 'Tiramisú', desc: 'Postre italiano tradicional', precio: 12, tiempo: 5, sub: 'Postres', img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80' },
      { nombre: 'Brownie con helado', desc: 'Brownie tibio con helado de vainilla', precio: 14, tiempo: 8, sub: 'Postres', img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80' },
    ],
  },
  {
    slug: 'pollo-brasa-don-pepe',
    nombre: 'Pollo a la Brasa Don Pepe',
    subtitulo: 'El auténtico sabor a la brasa',
    direccion: 'Av. San Martín 890, Pucallpa',
    referencia: 'Al frente de la comisaría',
    lat: -8.3775,
    lng: -74.55,
    celular: '910000005',
    tiempo: '40-50 min',
    min: 30,
    banner: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=200&q=80',
    categorias: ['pollo'],
    subcategorias: ['Pollos', 'Combos', 'Guarniciones', 'Bebidas'],
    platos: [
      { nombre: 'Pollo Entero', desc: 'Pollo a la brasa entero + papas + ensalada', precio: 60, tiempo: 30, sub: 'Pollos', img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&q=80', opciones: { titulo: 'Salsas', requerido: false, min: 0, max: 3, choices: ['Ají', 'Mayonesa', 'Ketchup', 'Huancaína'] } },
      { nombre: 'Medio Pollo', desc: 'Medio pollo + papas + ensalada', precio: 35, tiempo: 25, sub: 'Pollos', img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&q=80' },
      { nombre: 'Cuarto de Pollo', desc: 'Cuarto de pollo + papas + ensalada', precio: 22, tiempo: 20, sub: 'Pollos', img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&q=80' },
      { nombre: 'Combo Familiar', desc: 'Pollo entero + papas grande + gaseosa 1.5L', precio: 75, tiempo: 30, sub: 'Combos', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=600&q=80' },
      { nombre: 'Papas Fritas Familiar', desc: 'Porción grande para compartir', precio: 15, tiempo: 10, sub: 'Guarniciones', img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80' },
      { nombre: 'Ensalada Fresca', desc: 'Lechuga, tomate, pepino, limón', precio: 10, tiempo: 5, sub: 'Guarniciones', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80' },
      { nombre: 'Inca Kola 1.5L', desc: 'Gaseosa', precio: 10, tiempo: 2, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&q=80' },
      { nombre: 'Chicha Morada Jarra', desc: 'Jarra de chicha morada casera', precio: 12, tiempo: 3, sub: 'Bebidas', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80' },
    ],
  },
]

const CLIENTES = [
  { nombre: 'Juan Pérez', celular: '911111111' },
  { nombre: 'María García', celular: '911111112' },
  { nombre: 'Carlos Rodríguez', celular: '911111113' },
  { nombre: 'Ana Torres', celular: '911111114' },
  { nombre: 'Luis Sánchez', celular: '911111115' },
  { nombre: 'Rosa Flores', celular: '911111116' },
  { nombre: 'Pedro Ramírez', celular: '911111117' },
  { nombre: 'Carmen Vásquez', celular: '911111118' },
  { nombre: 'Jorge Mendoza', celular: '911111119' },
  { nombre: 'Lucía Ríos', celular: '911111120' },
  { nombre: 'Roberto Chávez', celular: '911111121' },
  { nombre: 'Elena Castro', celular: '911111122' },
  { nombre: 'Miguel Ortiz', celular: '911111123' },
  { nombre: 'Sofía Reyes', celular: '911111124' },
  { nombre: 'Diego Vargas', celular: '911111125' },
  { nombre: 'Patricia Núñez', celular: '911111126' },
  { nombre: 'Fernando Silva', celular: '911111127' },
  { nombre: 'Gabriela Paredes', celular: '911111128' },
  { nombre: 'Ricardo Campos', celular: '911111129' },
  { nombre: 'Daniela Rojas', celular: '911111130' },
]

const DIRECCIONES = [
  { etiqueta: 'Casa', direccion: 'Jr. Raimondi 123, Pucallpa', referencia: 'Portón verde' },
  { etiqueta: 'Trabajo', direccion: 'Av. San Martín 456, Pucallpa', referencia: 'Oficina 302' },
  { etiqueta: 'Casa', direccion: 'Jr. Ucayali 789, Pucallpa', referencia: 'Casa de 2 pisos' },
  { etiqueta: 'Casa', direccion: 'Av. Centenario 234, Pucallpa', referencia: 'Frente al parque' },
  { etiqueta: 'Casa', direccion: 'Jr. Tacna 567, Pucallpa', referencia: 'Al lado de la farmacia' },
  { etiqueta: 'Trabajo', direccion: 'Av. Arequipa 890, Pucallpa', referencia: 'Edificio azul' },
]

const DRIVERS = [
  { nombre: 'Carlos Repartidor', celular: '988888888', vehiculo: 'Moto Honda 150', placa: 'P-123456', licencia: 'Q12345678' },
  { nombre: 'Pedro Rápido', celular: '988888887', vehiculo: 'Moto Yamaha 125', placa: 'P-234567', licencia: 'Q23456789' },
  { nombre: 'Luis Veloz', celular: '988888886', vehiculo: 'Moto Bajaj 180', placa: 'P-345678', licencia: 'Q34567890' },
  { nombre: 'Miguel Trujillo', celular: '988888885', vehiculo: 'Moto Honda 125', placa: 'P-456789', licencia: 'Q45678901' },
  { nombre: 'José Ramírez', celular: '988888884', vehiculo: 'Moto Yamaha 150', placa: 'P-567890', licencia: 'Q56789012' },
  { nombre: 'Marco Antonio', celular: '988888883', vehiculo: 'Moto Honda 150', placa: 'P-678901', licencia: 'Q67890123' },
  { nombre: 'Raúl Cárdenas', celular: '988888882', vehiculo: 'Moto Bajaj 200', placa: 'P-789012', licencia: 'Q78901234' },
  { nombre: 'Víctor Huamán', celular: '988888881', vehiculo: 'Moto Honda 125', placa: 'P-890123', licencia: 'Q89012345' },
  { nombre: 'Julio Panduro', celular: '988888880', vehiculo: 'Moto Yamaha 125', placa: 'P-901234', licencia: 'Q90123456' },
  { nombre: 'Andrés Ríos', celular: '988888879', vehiculo: 'Moto Bajaj 180', placa: 'P-012345', licencia: 'Q01234567' },
]

const NOTAS_CLIENTE = [
  'Tocar el timbre 2 veces',
  'Sin cebolla por favor',
  'Por favor llamar al llegar',
  'Dejar en portería',
  'Es un regalo, avisar al llegar',
  null,
  null,
  null,
  'Sin ensalada',
  null,
  'Agregar extra de salsa',
  null,
  null,
  'Sin ají',
  null,
]

// ============================================================
// SEED
// ============================================================
async function seed() {
  console.log('🌱 Iniciando seed masivo...\n')

  // Limpiar datos de prueba previos (excepto admins)
  console.log('🧹 Limpiando datos previos...')
  await sql`DELETE FROM item_opciones`
  await sql`DELETE FROM pedido_items`
  await sql`DELETE FROM pedido_estado_historial`
  await sql`DELETE FROM sub_pedidos`
  await sql`DELETE FROM pedidos`
  await sql`DELETE FROM opciones_choices`
  await sql`DELETE FROM grupos_opciones`
  await sql`DELETE FROM platos`
  await sql`DELETE FROM subcategorias`
  await sql`DELETE FROM horarios_atencion`
  await sql`DELETE FROM restaurantes_categorias`
  await sql`DELETE FROM restaurantes`
  await sql`DELETE FROM direcciones`
  await sql`DELETE FROM driver_detalles`
  await sql`DELETE FROM usuarios WHERE role IN ('CUSTOMER','DRIVER','STAFF')`
  console.log('   ✅ Limpieza completa\n')

  // Obtener categorías existentes
  const catsRows = await sql`SELECT id, slug FROM categorias`
  const catMap = {}
  for (const c of catsRows) catMap[c.slug] = c.id

  // ==========================================================
  // RESTAURANTES + STAFF + SUBCATEGORÍAS + PLATOS + OPCIONES
  // ==========================================================
  console.log('🏪 Creando restaurantes...')

  const dias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
  const restaurantesCreados = []

  for (const r of RESTAURANTES) {
    // Crear usuario STAFF
    const staffRows = await sql`
      INSERT INTO usuarios (role, celular, password_hash, nombre)
      VALUES ('STAFF', ${r.celular}, ${HASH}, ${r.nombre})
      RETURNING id
    `
    const staffId = staffRows[0].id

    // Crear restaurante
    const restRows = await sql`
      INSERT INTO restaurantes (
        usuario_id, slug, nombre, subtitulo, direccion_fisica, referencia,
        lat, lng, celular, tiempo_estimado, monto_minimo, activo,
        banner_url, logo_url, calificacion, num_resenas
      ) VALUES (
        ${staffId}, ${r.slug}, ${r.nombre}, ${r.subtitulo}, ${r.direccion}, ${r.referencia},
        ${r.lat}, ${r.lng}, ${r.celular}, ${r.tiempo}, ${r.min}, true,
        ${r.banner}, ${r.logo}, ${(Math.random() * 1.5 + 3.5).toFixed(1)}, ${rand(50, 500)}
      )
      RETURNING id
    `
    const restId = restRows[0].id
    restaurantesCreados.push({ id: restId, slug: r.slug, ...r })

    // Categorías
    for (const catSlug of r.categorias) {
      if (catMap[catSlug]) {
        await sql`
          INSERT INTO restaurantes_categorias (restaurante_id, categoria_id)
          VALUES (${restId}, ${catMap[catSlug]})
          ON CONFLICT DO NOTHING
        `
      }
    }

    // Horarios
    for (const dia of dias) {
      const hora = r.slug.includes('alitas') ? '17:00' : r.slug.includes('pollo') ? '11:00' : '11:00'
      const cierre = r.slug.includes('alitas') ? '01:00' : '23:00'
      await sql`
        INSERT INTO horarios_atencion (restaurante_id, dia, hora_apertura, hora_cierre)
        VALUES (${restId}, ${dia}, ${hora}, ${cierre})
        ON CONFLICT (restaurante_id, dia) DO NOTHING
      `
    }

    // Subcategorías
    const subMap = {}
    for (let i = 0; i < r.subcategorias.length; i++) {
      const subRows = await sql`
        INSERT INTO subcategorias (restaurante_id, nombre, orden)
        VALUES (${restId}, ${r.subcategorias[i]}, ${i})
        RETURNING id
      `
      subMap[r.subcategorias[i]] = subRows[0].id
    }

    // Platos
    for (let i = 0; i < r.platos.length; i++) {
      const p = r.platos[i]
      const subId = subMap[p.sub] || null
      const platoRows = await sql`
        INSERT INTO platos (
          restaurante_id, subcategoria_id, nombre, descripcion,
          precio, imagen_url, tiempo_estimado, disponible, orden
        ) VALUES (
          ${restId}, ${subId}, ${p.nombre}, ${p.desc},
          ${p.precio}, ${p.img}, ${p.tiempo}, true, ${i}
        )
        RETURNING id
      `
      const platoId = platoRows[0].id

      // Opciones
      if (p.opciones) {
        const grupoRows = await sql`
          INSERT INTO grupos_opciones (plato_id, titulo, requerido, minimo, maximo, orden)
          VALUES (${platoId}, ${p.opciones.titulo}, ${p.opciones.requerido}, ${p.opciones.min}, ${p.opciones.max}, 0)
          RETURNING id
        `
        const grupoId = grupoRows[0].id
        for (let j = 0; j < p.opciones.choices.length; j++) {
          await sql`
            INSERT INTO opciones_choices (grupo_id, nombre, precio_extra, orden)
            VALUES (${grupoId}, ${p.opciones.choices[j]}, 0, ${j})
          `
        }
      }
    }

    console.log(`   ✅ ${r.nombre} (${r.platos.length} platos)`)
  }

  // ==========================================================
  // CLIENTES + DIRECCIONES
  // ==========================================================
  console.log('\n👥 Creando clientes...')
  const clientesCreados = []

  for (const c of CLIENTES) {
    const rows = await sql`
      INSERT INTO usuarios (role, celular, password_hash, nombre)
      VALUES ('CUSTOMER', ${c.celular}, ${HASH}, ${c.nombre})
      RETURNING id
    `
    const clienteId = rows[0].id
    clientesCreados.push({ id: clienteId, ...c })

    // 1-2 direcciones por cliente
    const numDirs = rand(1, 2)
    for (let i = 0; i < numDirs; i++) {
      const dir = pick(DIRECCIONES)
      await sql`
        INSERT INTO direcciones (
          usuario_id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
        ) VALUES (
          ${clienteId}, ${dir.etiqueta}, ${dir.direccion}, ${dir.referencia},
          ${-8.38 + (Math.random() - 0.5) * 0.02},
          ${-74.55 + (Math.random() - 0.5) * 0.02},
          ${i === 0}
        )
      `
    }
  }
  console.log(`   ✅ ${clientesCreados.length} clientes con direcciones`)

  // ==========================================================
  // DRIVERS
  // ==========================================================
  console.log('\n🏍️ Creando drivers...')
  const driversCreados = []

  for (const d of DRIVERS) {
    const userRows = await sql`
      INSERT INTO usuarios (role, celular, password_hash, nombre)
      VALUES ('DRIVER', ${d.celular}, ${HASH}, ${d.nombre})
      RETURNING id
    `
    const driverId = userRows[0].id
    await sql`
      INSERT INTO driver_detalles (usuario_id, vehiculo, placa, licencia, disponible)
      VALUES (${driverId}, ${d.vehiculo}, ${d.placa}, ${d.licencia}, ${Math.random() > 0.3})
    `
    driversCreados.push({ id: driverId, ...d })
  }
  console.log(`   ✅ ${driversCreados.length} drivers`)

  // ==========================================================
  // PEDIDOS
  // ==========================================================
  console.log('\n📦 Creando pedidos...')

  const platosRows = await sql`
    SELECT id, restaurante_id, nombre, precio FROM platos
  `

  const estados = ['ENTREGADO', 'ENTREGADO', 'ENTREGADO', 'ENTREGADO', 'EN_CAMINO', 'LISTO', 'ACEPTADO', 'PENDIENTE', 'CANCELADO', 'RECHAZADO']

  let pedidosCreados = 0

  for (let i = 0; i < 50; i++) {
    const cliente = pick(clientesCreados)
    const restaurante = pick(restaurantesCreados)
    const estado = pick(estados)

    // Días atrás (0-7 días para tener gráfico poblado)
    const diasAtras = rand(0, 7)
    const horasAtras = rand(0, 23)
    const creadoEn = new Date()
    creadoEn.setDate(creadoEn.getDate() - diasAtras)
    creadoEn.setHours(creadoEn.getHours() - horasAtras)

    // Items de este restaurante
    const platosRest = platosRows.filter((p) => p.restaurante_id === restaurante.id)
    if (platosRest.length === 0) continue

    const numItems = rand(1, 3)
    const items = []
    let subtotal = 0

    for (let j = 0; j < numItems; j++) {
      const plato = pick(platosRest)
      const cant = rand(1, 2)
      const sub = Number(plato.precio) * cant
      items.push({ plato, cant, sub })
      subtotal += sub
    }

    const propina = Math.random() > 0.7 ? rand(2, 8) : 0
    const vip = Math.random() > 0.9
    const costoVip = vip ? 2.30 : 0
    const costoEnvio = rand(4, 12)
    const total = subtotal + costoEnvio + propina + costoVip

    // Dirección snapshot
    const dir = pick(DIRECCIONES)
    const dirSnapshot = {
      etiqueta: dir.etiqueta,
      direccion: dir.direccion,
      referencia: dir.referencia,
      lat: -8.38 + (Math.random() - 0.5) * 0.02,
      lng: -74.55 + (Math.random() - 0.5) * 0.02,
    }

    // Crear pedido
    const pedidoRows = await sql`
      INSERT INTO pedidos (
        codigo, usuario_id, subtotal, total_envio, propina, vip, costo_vip, total,
        notas, estado_global, creado_en, actualizado_en
      ) VALUES (
        ${codigo()}, ${cliente.id}, ${subtotal}, ${costoEnvio}, ${propina}, ${vip}, ${costoVip}, ${total},
        ${pick(NOTAS_CLIENTE)}, ${estado}, ${creadoEn.toISOString()}, ${creadoEn.toISOString()}
      )
      RETURNING id
    `
    const pedidoId = pedidoRows[0].id

    // Determinar timestamps de estado
    let aceptadoEn = null, listoEn = null, recogidoEn = null, entregadoEn = null
    if (['ACEPTADO', 'LISTO', 'EN_CAMINO', 'ENTREGADO'].includes(estado)) {
      const d1 = new Date(creadoEn); d1.setMinutes(d1.getMinutes() + 2); aceptadoEn = d1
    }
    if (['LISTO', 'EN_CAMINO', 'ENTREGADO'].includes(estado)) {
      const d2 = new Date(creadoEn); d2.setMinutes(d2.getMinutes() + rand(15, 25)); listoEn = d2
    }
    if (['EN_CAMINO', 'ENTREGADO'].includes(estado)) {
      const d3 = new Date(creadoEn); d3.setMinutes(d3.getMinutes() + rand(26, 35)); recogidoEn = d3
    }
    if (estado === 'ENTREGADO') {
      const d4 = new Date(creadoEn); d4.setMinutes(d4.getMinutes() + rand(36, 55)); entregadoEn = d4
    }

    // Driver asignado (solo si está en camino o entregado)
    const driverAsignado = ['EN_CAMINO', 'ENTREGADO'].includes(estado)
      ? pick(driversCreados)
      : null

    // Sub-pedido
    const spRows = await sql`
      INSERT INTO sub_pedidos (
        pedido_id, restaurante_id, driver_id, estado, subtotal, costo_envio,
        distancia_km, tiempo_estimado, direccion_snapshot, notas,
        creado_en, aceptado_en, listo_en, recogido_en, entregado_en
      ) VALUES (
        ${pedidoId}, ${restaurante.id}, ${driverAsignado?.id || null}, ${estado},
        ${subtotal}, ${costoEnvio}, ${rand(1, 5) + Math.random()}, ${rand(15, 40)},
        ${JSON.stringify(dirSnapshot)}::jsonb, null,
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
    for (const it of items) {
      await sql`
        INSERT INTO pedido_items (
          sub_pedido_id, plato_id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas
        ) VALUES (
          ${spId}, ${it.plato.id}, ${it.plato.nombre}, ${it.plato.precio}, ${it.cant}, ${it.sub},
          ${Math.random() > 0.8 ? pick(['Sin cebolla', 'Sin ají', 'Extra salsa', 'Sin ensalada']) : null}
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
    if (listoEn) {
      await sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, notas, creado_en)
        VALUES (${spId}, 'LISTO', 'Listo para recoger', ${listoEn.toISOString()})
      `
    }
    if (recogidoEn) {
      await sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, notas, creado_en)
        VALUES (${spId}, 'EN_CAMINO', ${driverAsignado ? `Asignado a ${driverAsignado.nombre}` : 'En camino'}, ${recogidoEn.toISOString()})
      `
    }
    if (entregadoEn) {
      await sql`
        INSERT INTO pedido_estado_historial (sub_pedido_id, estado, notas, creado_en)
        VALUES (${spId}, 'ENTREGADO', 'Entregado al cliente', ${entregadoEn.toISOString()})
      `
    }

    pedidosCreados++
  }

  console.log(`   ✅ ${pedidosCreados} pedidos creados`)

  // ==========================================================
  // RESUMEN
  // ==========================================================
  console.log('\n🎉 SEED MASIVO COMPLETADO\n')
  console.log('═══════════════════════════════════════════════')
  console.log('  CREDENCIALES DE PRUEBA')
  console.log('═══════════════════════════════════════════════')
  console.log('  ADMIN:    admin1@foodxpres.pe / admin123')
  console.log('  CLIENTES: 911111111 a 911111130 / 123456')
  console.log('  DRIVERS:  988888879 a 988888888 / 123456')
  console.log('  STAFF:    910000001 a 910000005 / 123456')
  console.log('═══════════════════════════════════════════════\n')
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
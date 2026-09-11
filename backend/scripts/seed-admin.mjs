// ============================================================
// SEED: crear admin inicial + categorías base
// Ejecutar desde la raíz: node backend/scripts/seed-admin.mjs
// ============================================================
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar .env.local de web-admin manualmente
try {
  const envPath = resolve(__dirname, '../../apps/web-admin/.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^"|"$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  })
  console.log('✅ .env.local cargado\n')
} catch (e) {
  console.warn('⚠️  No se pudo leer .env.local, usando variables del sistema\n')
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no encontrada')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function seed() {
  console.log('🌱 Iniciando seed...\n')

  // 1. ADMIN
  const adminEmail = 'admin@foodxpres.pe'
  const adminPass = 'admin123' // ⚠️ CAMBIAR después del primer login
  const passwordHash = await bcrypt.hash(adminPass, 10)

  const existingAdmin = await sql`
    SELECT id FROM usuarios WHERE email = ${adminEmail}
  `

  if (existingAdmin.length === 0) {
    await sql`
      INSERT INTO usuarios (role, email, password_hash, nombre)
      VALUES ('ADMIN', ${adminEmail}, ${passwordHash}, 'Administrador General')
    `
    console.log(`✅ Admin creado: ${adminEmail} / ${adminPass}`)
  } else {
    console.log(`ℹ️  Admin ya existe: ${adminEmail}`)
  }

  // 2. CATEGORÍAS BASE
  const categorias = [
    { slug: 'hamburguesas', nombre: 'Hamburguesas' },
    { slug: 'pizzas',       nombre: 'Pizzas' },
    { slug: 'sushi',        nombre: 'Sushi' },
    { slug: 'pollo',        nombre: 'Pollo' },
    { slug: 'bebidas',      nombre: 'Bebidas' },
    { slug: 'postres',      nombre: 'Postres' },
  ]

  for (const cat of categorias) {
    await sql`
      INSERT INTO categorias (slug, nombre)
      VALUES (${cat.slug}, ${cat.nombre})
      ON CONFLICT (slug) DO NOTHING
    `
  }
  console.log(`✅ ${categorias.length} categorías listas`)

  console.log('\n🎉 Seed completado.')
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
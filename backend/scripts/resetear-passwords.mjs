import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

const sql = neon(process.env.DATABASE_URL)

const STAFF_PASSWORD = await bcrypt.hash('local123', 10)
const DRIVER_PASSWORD = await bcrypt.hash('driver123', 10)

console.log('🔄 Reseteando passwords...\n')

// STAFF
const staffResult = await sql`
  UPDATE usuarios 
  SET password_hash = ${STAFF_PASSWORD}
  WHERE role = 'STAFF'
  RETURNING id, nombre, email
`
console.log(`✅ ${staffResult.length} STAFF actualizados (password: local123)`)
staffResult.forEach((u) => console.log(`   - ${u.email} (${u.nombre})`))

// DRIVERS
const driverResult = await sql`
  UPDATE usuarios 
  SET password_hash = ${DRIVER_PASSWORD}
  WHERE role = 'DRIVER'
  RETURNING id, nombre, email
`
console.log(`\n✅ ${driverResult.length} DRIVERS actualizados (password: driver123)`)
driverResult.forEach((u) => console.log(`   - ${u.email} (${u.nombre})`))

console.log('\n🎉 Listo')
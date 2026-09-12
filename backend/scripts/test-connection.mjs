import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = resolve(__dirname, '../../apps/web-admin/.env.local')
console.log('📂 Leyendo:', envPath)

const envContent = readFileSync(envPath, 'utf-8')
console.log('📄 Longitud del archivo:', envContent.length, 'caracteres')
console.log('📄 Primeros 100 caracteres (crudo):')
console.log(JSON.stringify(envContent.substring(0, 100)))
console.log()

// Parser más robusto
envContent.split(/\r?\n/).forEach((line) => {
  const clean = line.replace(/\r$/, '').trim()
  if (!clean || clean.startsWith('#')) return
  const idx = clean.indexOf('=')
  if (idx === -1) return
  const key = clean.slice(0, idx).trim()
  let value = clean.slice(idx + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = value
})

console.log('===========================================')
console.log('DIAGNÓSTICO DE CONEXIÓN A NEON')
console.log('===========================================\n')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL no está definida')
  console.error('Variables cargadas:', Object.keys(process.env).filter(k => 
    k === 'DATABASE_URL' || k === 'AUTH_SECRET'
  ))
  process.exit(1)
}

const safeUrl = url.replace(/:([^@]+)@/, ':***@')
console.log('📌 URL:', safeUrl.substring(0, 90) + '...\n')

console.log('🔍 Verificaciones:')
console.log('   - Empieza con postgresql:// :', url.startsWith('postgresql://'))
console.log('   - Contiene -pooler          :', url.includes('-pooler'))
console.log('   - Termina con sslmode       :', url.includes('sslmode=require'))
console.log()

const sql = neon(url)

try {
  console.log('🌐 Probando conexión...')
  const result = await sql`SELECT NOW() as now, current_database() as db`
  console.log('✅ Conexión OK')
  console.log('   Hora BD:', result[0].now)
  console.log('   Base de datos:', result[0].db)
} catch (err) {
  console.error('❌ Error de conexión:')
  console.error('   Mensaje:', err.message)
  console.error('   Código:', err.code)
}
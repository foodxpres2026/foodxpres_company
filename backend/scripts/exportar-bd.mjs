// ============================================================
// EXPORTAR TODA LA BD A UN ARCHIVO JSON
// Ejecutar: node backend/scripts/exportar-bd.mjs
// ============================================================
import { neon } from '@neondatabase/serverless'
import { writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer .env.local del admin
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

// Tablas en orden de dependencias (padres primero, hijos después)
const TABLAS = [
  'usuarios',
  'direcciones',
  'categorias',
  'tags',
  'restaurantes',
  'horarios_atencion',
  'subcategorias',
  'platos',
  'grupos_opciones',
  'opciones_choices',
  'restaurantes_categorias',
  'restaurantes_tags',
  'driver_detalles',
  'promociones',
  'pedidos',
  'sub_pedidos',
  'pedido_items',
  'item_opciones',
  'pedido_estado_historial',
  'notificaciones',
  'push_tokens',
  'push_subscriptions',
  'otp_codes',
  'favoritos',
  'configuracion_sistema',
  'rutas_cache',
  'solicitudes_recuperacion',
]

async function exportar() {
  console.log('📤 Exportando base de datos...\n')

  const backup = {
    exportado_en: new Date().toISOString(),
    tablas: {},
  }

  let totalFilas = 0

  for (const tabla of TABLAS) {
    try {
      const rows = await sql(`SELECT * FROM ${tabla}`)
      backup.tablas[tabla] = rows
      totalFilas += rows.length
      console.log(`   ✅ ${tabla}: ${rows.length} filas`)
    } catch (err) {
      console.log(`   ⚠️  ${tabla}: no existe o error (${err.message})`)
      backup.tablas[tabla] = []
    }
  }

  const filename = resolve(__dirname, 'backup-foodxpres.json')
  writeFileSync(filename, JSON.stringify(backup, null, 2))

  console.log(`\n🎉 Exportación completa:`)
  console.log(`   Total de filas: ${totalFilas}`)
  console.log(`   Archivo: ${filename}`)
  console.log(`   Tamaño: ${(JSON.stringify(backup).length / 1024).toFixed(2)} KB`)
}

exportar().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
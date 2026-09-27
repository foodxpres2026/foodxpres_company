// ============================================================
// EXPORTAR ESTRUCTURA + DATOS COMPLETOS DE LA BASE DE DATOS
// No asume ninguna tabla de antemano: lee todo directo del
// catálogo de Postgres (information_schema / pg_catalog), así
// que aunque tu esquema haya cambiado 100 veces, esto siempre
// refleja lo que HAY, no lo que el código cree que hay.
//
// Uso:
//   node backend/scripts/exports/exportar-completo.mjs
//   node backend/scripts/exports/exportar-completo.mjs --env=../../../apps/web-admin/.env.local
//   node backend/scripts/exports/exportar-completo.mjs --db="postgres://usuario:pass@host/db"
//
// Requiere: @neondatabase/serverless (ya está en tu monorepo)
//
// Genera estructura en backend/database/schema y datos en private-data:
//   1. estructura-bd.md    -> documentación legible: tablas,
//                             columnas, tipos, PKs, FKs, índices
//   2. estructura-bd.json  -> lo mismo pero en JSON (para leer
//                             por código, ej. generar tipos TS)
//   3. datos-bd.json       -> el contenido completo de cada tabla
// ============================================================

import { neon } from '@neondatabase/serverless'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaDir = resolve(__dirname, '../../database/schema')
const privateDir = resolve(__dirname, '../../database/private-data')

// ------------------------------------------------------------
// 1. Resolver DATABASE_URL: por --db, por --env, o buscando
//    .env.local en las ubicaciones típicas del monorepo.
// ------------------------------------------------------------
const args = process.argv.slice(2)
const dbArg = args.find((a) => a.startsWith('--db='))?.split('=')[1]
const envArg = args.find((a) => a.startsWith('--env='))?.split('=')[1]

function cargarEnv(path) {
  if (!existsSync(path)) return false
  const contenido = readFileSync(path, 'utf-8')
  contenido.split(/\r?\n/).forEach((line) => {
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
  return true
}

if (dbArg) {
  process.env.DATABASE_URL = dbArg
} else if (envArg) {
  cargarEnv(resolve(__dirname, envArg))
} else {
  // Rutas típicas donde puede estar tu .env.local en el monorepo
  const candidatos = [
    resolve(__dirname, '.env.local'),
    resolve(__dirname, '../.env.local'),
    resolve(__dirname, '../../../apps/web-admin/.env.local'),
    resolve(__dirname, '../../../apps/web-clientes/.env.local'),
    resolve(__dirname, '../../../.env.local'),
  ]
  const encontrado = candidatos.find((p) => existsSync(p))
  if (encontrado) {
    console.log(`ℹ️  Usando variables de: ${encontrado}`)
    cargarEnv(encontrado)
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    '❌ No encontré DATABASE_URL. Pásala con --db="postgres://..." o --env=ruta/al/.env.local'
  )
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// ------------------------------------------------------------
// 2. Descubrir TODAS las tablas del esquema "public"
// ------------------------------------------------------------
async function listarTablas() {
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  return rows.map((r) => r.table_name)
}

// ------------------------------------------------------------
// 3. Columnas + tipos de una tabla
// ------------------------------------------------------------
async function columnasDe(tabla) {
  return await sql`
    SELECT
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tabla}
    ORDER BY ordinal_position
  `
}

// ------------------------------------------------------------
// 4. Constraints: PK, FK, UNIQUE, CHECK
// ------------------------------------------------------------
async function constraintsDe(tabla) {
  return await sql`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name  AS tabla_referenciada,
      ccu.column_name AS columna_referenciada
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.constraint_type = 'FOREIGN KEY'
    WHERE tc.table_schema = 'public' AND tc.table_name = ${tabla}
    ORDER BY tc.constraint_type, kcu.ordinal_position
  `
}

// ------------------------------------------------------------
// 5. Índices
// ------------------------------------------------------------
async function indicesDe(tabla) {
  return await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ${tabla}
  `
}

// ------------------------------------------------------------
// 6. Formatear tipo de columna como en un CREATE TABLE
// ------------------------------------------------------------
function formatearTipo(col) {
  const { data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale } = col
  if (data_type === 'character varying') return `VARCHAR(${character_maximum_length ?? '?'})`
  if (data_type === 'numeric' && numeric_precision) return `NUMERIC(${numeric_precision},${numeric_scale ?? 0})`
  if (data_type === 'ARRAY') return `${udt_name.replace(/^_/, '')}[]`
  if (data_type === 'USER-DEFINED') return udt_name
  return data_type.toUpperCase()
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
async function main() {
  mkdirSync(schemaDir, { recursive: true })
  mkdirSync(privateDir, { recursive: true })
  console.log('🔍 Descubriendo tablas en la base de datos...\n')
  const tablas = await listarTablas()
  console.log(`   Encontradas ${tablas.length} tablas: ${tablas.join(', ')}\n`)

  const estructura = {}
  const datos = { exportado_en: new Date().toISOString(), tablas: {} }
  let totalFilas = 0

  let mdEstructura = `# Estructura real de la base de datos\n\n`
  mdEstructura += `> Generado automáticamente el ${new Date().toISOString()}. Refleja EXACTAMENTE lo que hay en la BD, no lo que dice ningún archivo .sql viejo.\n\n`
  mdEstructura += `**Total de tablas:** ${tablas.length}\n\n---\n\n`

  for (const tabla of tablas) {
    console.log(`📋 Procesando ${tabla}...`)

    const [columnas, constraints, indices, filas] = await Promise.all([
      columnasDe(tabla),
      constraintsDe(tabla),
      indicesDe(tabla),
      sql.query(`SELECT * FROM ${tabla}`),
    ])

    estructura[tabla] = { columnas, constraints, indices, total_filas: filas.length }
    datos.tablas[tabla] = filas
    totalFilas += filas.length

    // --- Markdown de esta tabla ---
    mdEstructura += `## \`${tabla}\`  (${filas.length} filas)\n\n`
    mdEstructura += `| Columna | Tipo | Nullable | Default |\n|---|---|---|---|\n`
    for (const c of columnas) {
      mdEstructura += `| ${c.column_name} | ${formatearTipo(c)} | ${c.is_nullable === 'YES' ? 'sí' : 'no'} | ${c.column_default ?? '—'} |\n`
    }

    const pks = constraints.filter((c) => c.constraint_type === 'PRIMARY KEY')
    const fks = constraints.filter((c) => c.constraint_type === 'FOREIGN KEY')
    const uniques = constraints.filter((c) => c.constraint_type === 'UNIQUE')

    if (pks.length) mdEstructura += `\n**Primary key:** ${pks.map((p) => p.column_name).join(', ')}\n`
    if (fks.length) {
      mdEstructura += `\n**Foreign keys:**\n`
      for (const f of fks) {
        mdEstructura += `- \`${f.column_name}\` → \`${f.tabla_referenciada}.${f.columna_referenciada}\`\n`
      }
    }
    if (uniques.length) mdEstructura += `\n**Unique:** ${uniques.map((u) => u.column_name).join(', ')}\n`
    if (indices.length) {
      mdEstructura += `\n**Índices:**\n`
      for (const i of indices) mdEstructura += `- \`${i.indexname}\`: \`${i.indexdef}\`\n`
    }
    mdEstructura += `\n---\n\n`

    console.log(`   ✅ ${columnas.length} columnas, ${filas.length} filas`)
  }

  writeFileSync(resolve(schemaDir, 'estructura-bd.md'), mdEstructura)
  writeFileSync(resolve(schemaDir, 'estructura-bd.json'), JSON.stringify(estructura, null, 2))
  writeFileSync(resolve(privateDir, 'datos-bd.json'), JSON.stringify(datos, null, 2))

  console.log(`\n🎉 Exportación completa:`)
  console.log(`   Tablas: ${tablas.length}`)
  console.log(`   Filas totales: ${totalFilas}`)
  console.log(`   Archivos generados:`)
  console.log(`     - backend/database/schema/estructura-bd.md`)
  console.log(`     - backend/database/schema/estructura-bd.json`)
  console.log(`     - backend/database/private-data/datos-bd.json (privado; ignorado por Git)`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})

// Restaura respaldo-completo.sql en una base Neon vacía usando el driver ya instalado.
// Define TARGET_DATABASE_URL antes de ejecutarlo para evitar restaurar por accidente en el origen.
// Uso en PowerShell: $env:TARGET_DATABASE_URL = Read-Host "URL de la base Neon destino"
//                    node backend/scripts/exports/importar-completo.mjs --confirmar

import { neon } from '@neondatabase/serverless'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const fileArg = args.find((arg) => arg.startsWith('--file='))?.slice('--file='.length)
const databaseUrl = process.env.TARGET_DATABASE_URL
if (!databaseUrl) {
  throw new Error('Falta TARGET_DATABASE_URL. Así se evita restaurar por accidente en la URL origen (DATABASE_URL).')
}
if (!args.includes('--confirmar')) {
  throw new Error('Por seguridad, confirma que el destino está vacío agregando --confirmar al comando.')
}

const archivoSql = resolve(process.cwd(), fileArg || 'backend/database/private-data/respaldo-completo.sql')
if (!existsSync(archivoSql)) throw new Error(`No encuentro el respaldo SQL: ${archivoSql}`)
const contenido = readFileSync(archivoSql, 'utf8')
const sql = neon(databaseUrl)

function dividirSentencias(texto) {
  const sentencias = []
  let actual = ''
  let comilla = null
  let dollarTag = null
  let comentarioLinea = false
  let comentarioBloque = false

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i]
    const next = texto[i + 1]

    if (comentarioLinea) {
      if (char === '\n') comentarioLinea = false
      actual += char
      continue
    }
    if (comentarioBloque) {
      actual += char
      if (char === '*' && next === '/') {
        actual += next
        i++
        comentarioBloque = false
      }
      continue
    }
    if (dollarTag) {
      if (texto.startsWith(dollarTag, i)) {
        actual += dollarTag
        i += dollarTag.length - 1
        dollarTag = null
      } else actual += char
      continue
    }
    if (comilla) {
      actual += char
      if (char === comilla) {
        if (next === comilla) {
          actual += next
          i++
        } else comilla = null
      }
      continue
    }

    if (char === '-' && next === '-') {
      actual += '--'
      i++
      comentarioLinea = true
    } else if (char === '/' && next === '*') {
      actual += '/*'
      i++
      comentarioBloque = true
    } else if (char === "'" || char === '"') {
      comilla = char
      actual += char
    } else if (char === '$') {
      const match = texto.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)
      if (match) {
        dollarTag = match[0]
        actual += dollarTag
        i += dollarTag.length - 1
      } else actual += char
    } else if (char === ';') {
      if (actual.trim()) sentencias.push(actual.trim())
      actual = ''
    } else actual += char
  }

  if (actual.trim()) sentencias.push(actual.trim())
  return sentencias
}

async function main() {
  const sentencias = dividirSentencias(contenido)
  console.log(`Se ejecutarán ${sentencias.length} sentencias en el destino.`)
  console.log('Debe ser una base vacía. Si la restauración falla a mitad, crea otra base vacía y vuelve a empezar.')

  for (let i = 0; i < sentencias.length; i++) {
    await sql.query(sentencias[i], [])
    if ((i + 1) % 25 === 0 || i + 1 === sentencias.length) {
      console.log(`   ${i + 1}/${sentencias.length}`)
    }
  }
  console.log('✅ Restauración completada.')
}

main().catch((error) => {
  console.error('❌ Error al restaurar:', error.message || error)
  process.exit(1)
})

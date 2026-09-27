import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getDriver, localCorsHeaders, localCorsJson } from '@/lib/local-auth'

const schema = z.object({ disponible: z.boolean() })

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
}

export async function PATCH(req: NextRequest) {
  const driver = await getDriver(req)
  if (!driver) return localCorsJson(req, { ok: false, error: 'No autorizado' }, { status: 401 }, 'PATCH, OPTIONS')
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return localCorsJson(req, { ok: false, error: 'Estado inválido' }, { status: 400 }, 'PATCH, OPTIONS')

  try {
    await sql`
      UPDATE driver_detalles SET disponible = ${parsed.data.disponible}, actualizado_en = NOW()
      WHERE usuario_id = ${driver.id}
    `
    return localCorsJson(req, { ok: true, disponible: parsed.data.disponible }, {}, 'PATCH, OPTIONS')
  } catch (error) {
    console.error('Disponibilidad driver error:', error)
    return localCorsJson(req, { ok: false, error: 'No se pudo actualizar tu disponibilidad' }, { status: 500 }, 'PATCH, OPTIONS')
  }
}

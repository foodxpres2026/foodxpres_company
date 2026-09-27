import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { createDriverToken, localCorsHeaders, localCorsJson } from '@/lib/local-auth'

const schema = z.object({ celular: z.string().regex(/^9\d{8}$/), password: z.string().min(1).max(200) })

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'POST, OPTIONS') })
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return localCorsJson(req, { ok: false, error: 'Credenciales inválidas' }, { status: 400 }, 'POST, OPTIONS')

    const rows = (await sql`
      SELECT u.id, u.nombre, u.celular, u.password_hash
      FROM usuarios u
      INNER JOIN driver_detalles d ON d.usuario_id = u.id
      WHERE u.celular = ${parsed.data.celular}
        AND u.role = 'DRIVER'
        AND u.activo = TRUE
      LIMIT 1
    `) as any[]
    const driver = rows[0]
    if (!driver?.password_hash || !(await bcrypt.compare(parsed.data.password, driver.password_hash))) {
      return localCorsJson(req, { ok: false, error: 'Credenciales inválidas' }, { status: 401 }, 'POST, OPTIONS')
    }

    return localCorsJson(req, {
      ok: true,
      user: { id: driver.id, nombre: driver.nombre, celular: driver.celular },
      token: createDriverToken({ id: driver.id, name: driver.nombre }),
    }, {}, 'POST, OPTIONS')
  } catch (error) {
    console.error('Login-driver error:', error)
    return localCorsJson(req, { ok: false, error: 'No se pudo iniciar sesión' }, { status: 500 }, 'POST, OPTIONS')
  }
}

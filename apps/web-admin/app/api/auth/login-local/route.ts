import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { createLocalToken, localCorsHeaders } from '@/lib/local-auth'

// ============================================
// CORS HEADERS (para apps Flutter)
// ============================================
// Handler para preflight (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: localCorsHeaders(req, 'POST, OPTIONS'),
  })
}

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos' },
        { status: 400, headers: localCorsHeaders(req, 'POST, OPTIONS') }
      )
    }

    const { email, password } = parsed.data

    const rows = (await sql`
      SELECT 
        u.id, u.nombre, u.password_hash, u.restaurante_id,
        r.nombre as restaurant_name
      FROM usuarios u
      LEFT JOIN restaurantes r ON r.id = u.restaurante_id
      WHERE u.email = ${email} AND u.role = 'STAFF' AND u.activo = TRUE
      LIMIT 1
    `) as any[]

    if (rows.length === 0) {
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401, headers: localCorsHeaders(req, 'POST, OPTIONS') }
      )
    }

    const user = rows[0]

    if (!user.password_hash) {
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401, headers: localCorsHeaders(req, 'POST, OPTIONS') }
      )
    }

    const valido = await bcrypt.compare(password, user.password_hash)

    if (!valido) {
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
        { status: 401, headers: localCorsHeaders(req, 'POST, OPTIONS') }
      )
    }

    if (!user.restaurante_id) {
      return Response.json(
        { ok: false, error: 'La cuenta no tiene un restaurante asignado' },
        { status: 403, headers: localCorsHeaders(req, 'POST, OPTIONS') }
      )
    }

    const token = createLocalToken({
      id: user.id,
      restaurantId: user.restaurante_id,
      name: user.nombre,
    })

    return Response.json(
      {
        ok: true,
        user: {
          id: user.id,
          token,
          restaurant_id: user.restaurante_id,
          restaurant_name: user.restaurant_name,
          nombre: user.nombre,
        },
      },
      { headers: localCorsHeaders(req, 'POST, OPTIONS') }
    )
  } catch (error) {
    console.error('Login-local error:', error)
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500, headers: localCorsHeaders(req, 'POST, OPTIONS') }
    )
  }
}

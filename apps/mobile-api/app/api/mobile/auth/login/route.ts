import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { createMobileToken } from '@/lib/mobile-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const passwordSchema = z.string().min(1).max(200).refine((password) => Buffer.byteLength(password, 'utf8') <= 72)
const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('local'), email: z.string().trim().email().max(254), password: passwordSchema }),
  z.object({ kind: z.literal('driver'), celular: z.string().regex(/^9\d{8}$/), password: passwordSchema }),
])

function corsHeaders(request: NextRequest, methods = 'POST, OPTIONS') {
  const origin = request.headers.get('origin')
  const allowed = (process.env.MOBILE_ALLOWED_ORIGINS ?? 'http://localhost:5555,http://localhost:5556')
    .split(',').map((value) => value.trim()).filter(Boolean)
  const headers = new Headers({
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  })
  if (origin && allowed.includes(origin)) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

export function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request)
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 8_192) return Response.json({ ok: false, error: 'Solicitud demasiado grande' }, { status: 413, headers })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ ok: false, error: 'Revisa los datos ingresados' }, { status: 400, headers })

    if (parsed.data.kind === 'local') {
      const email = parsed.data.email.toLowerCase()
      const rows = await sql`
        SELECT u.id, u.nombre, u.password_hash, u.restaurante_id, r.nombre AS restaurant_name
        FROM usuarios u
        LEFT JOIN restaurantes r ON r.id = u.restaurante_id
        WHERE lower(u.email) = ${email} AND u.role = 'STAFF' AND u.activo = TRUE
        LIMIT 1
      ` as { id: string; nombre: string; password_hash: string | null; restaurante_id: string | null; restaurant_name: string | null }[]
      const account = rows[0]
      if (!account?.password_hash || !(await bcrypt.compare(parsed.data.password, account.password_hash))) {
        return Response.json({ ok: false, error: 'Correo o contraseña incorrectos' }, { status: 401, headers })
      }
      if (!account.restaurante_id) return Response.json({ ok: false, error: 'La cuenta no tiene un local asignado' }, { status: 403, headers })
      const token = createMobileToken({ id: account.id, role: 'STAFF', restaurantId: account.restaurante_id })
      return Response.json({ ok: true, token: token.accessToken, tokenType: 'Bearer', expiresIn: token.expiresIn, user: { id: account.id, role: 'STAFF', name: account.nombre, email, restaurantId: account.restaurante_id, restaurantName: account.restaurant_name } }, { headers })
    }

    const rows = await sql`
      SELECT u.id, u.nombre, u.celular, u.password_hash
      FROM usuarios u
      INNER JOIN driver_detalles d ON d.usuario_id = u.id
      WHERE u.celular = ${parsed.data.celular} AND u.role = 'DRIVER' AND u.activo = TRUE
      LIMIT 1
    ` as { id: string; nombre: string; celular: string; password_hash: string | null }[]
    const account = rows[0]
    if (!account?.password_hash || !(await bcrypt.compare(parsed.data.password, account.password_hash))) {
      return Response.json({ ok: false, error: 'Celular o contraseña incorrectos' }, { status: 401, headers })
    }
    const token = createMobileToken({ id: account.id, role: 'DRIVER' })
    return Response.json({ ok: true, token: token.accessToken, tokenType: 'Bearer', expiresIn: token.expiresIn, user: { id: account.id, role: 'DRIVER', name: account.nombre, celular: account.celular } }, { headers })
  } catch (error) {
    console.error('Mobile login failed')
    return Response.json({ ok: false, error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' }, { status: 500, headers })
  }
}

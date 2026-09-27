import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { sql } from './db'

const TOKEN_TTL_SECONDS = 60 * 60 * 12

export interface LocalStaffSession {
  id: string
  restaurantId: string
  name: string
}

export interface DriverSession {
  id: string
  name: string
}

export function localCorsHeaders(req: NextRequest, methods: string) {
  const origins = (process.env.APP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://localhost:3001')
  }

  const origin = req.headers.get('origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
  if (origin && origins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function localCorsJson(
  req: NextRequest,
  body: unknown,
  init: ResponseInit = {},
  methods = 'GET, OPTIONS',
) {
  const headers = new Headers(init.headers)
  for (const [name, value] of Object.entries(localCorsHeaders(req, methods))) {
    headers.set(name, value)
  }
  return Response.json(body, { ...init, headers })
}

function sign(payload: string) {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET debe tener al menos 32 caracteres')
  }
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function createToken(claims: Record<string, string | number>) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function createLocalToken(staff: LocalStaffSession) {
  const now = Math.floor(Date.now() / 1000)
  return createToken({
    sub: staff.id,
    restaurantId: staff.restaurantId,
    role: 'STAFF',
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  })
}

export function createDriverToken(driver: DriverSession) {
  const now = Math.floor(Date.now() / 1000)
  return createToken({
    sub: driver.id,
    role: 'DRIVER',
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  })
}

function readToken(token: string, role: 'STAFF' | 'DRIVER') {
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return null

  try {
    const expected = Buffer.from(sign(payload), 'base64url')
    const received = Buffer.from(signature, 'base64url')
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return null
    }

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (
      claims.role !== role ||
      typeof claims.sub !== 'string' ||
      (role === 'STAFF' && typeof claims.restaurantId !== 'string') ||
      typeof claims.exp !== 'number' ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }
    return claims as { sub: string; restaurantId: string; exp: number }
  } catch {
    return null
  }
}

function bearerToken(req: NextRequest) {
  const authorization = req.headers.get('authorization')
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function getLocalStaff(req: NextRequest): Promise<LocalStaffSession | null> {
  const token = bearerToken(req)
  if (!token) return null

  const claims = readToken(token, 'STAFF')
  if (!claims) return null

  const rows = (await sql`
    SELECT id, nombre, restaurante_id
    FROM usuarios
    WHERE id = ${claims.sub}
      AND restaurante_id = ${claims.restaurantId}
      AND role = 'STAFF'
      AND activo = TRUE
    LIMIT 1
  `) as any[]

  if (rows.length === 0) return null
  return {
    id: rows[0].id,
    name: rows[0].nombre,
    restaurantId: rows[0].restaurante_id,
  }
}

export async function getDriver(req: NextRequest): Promise<DriverSession | null> {
  const token = bearerToken(req)
  if (!token) return null
  const claims = readToken(token, 'DRIVER')
  if (!claims) return null

  const rows = (await sql`
    SELECT u.id, u.nombre
    FROM usuarios u
    INNER JOIN driver_detalles d ON d.usuario_id = u.id
    WHERE u.id = ${claims.sub}
      AND u.role = 'DRIVER'
      AND u.activo = TRUE
    LIMIT 1
  `) as any[]

  if (rows.length === 0) return null
  return { id: rows[0].id, name: rows[0].nombre }
}

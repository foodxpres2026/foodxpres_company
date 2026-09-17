import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { sql } from './db'

const COOKIE_NAME = 'foodxpres_client'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export interface SessionUser {
  id: string
  role: 'CUSTOMER'
  celular: string
  nombre: string
}

// ============================================
// PASSWORD
// ============================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// FIRMA HMAC
// ============================================
function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET no está definido')
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function decodeSession(token: string): SessionUser | null {
  try {
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null

    const expected = sign(payload)
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null

    return JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    ) as SessionUser
  } catch {
    return null
  }
}

// ============================================
// COOKIE
// ============================================
export async function setSessionCookie(user: SessionUser) {
  const token = encodeSession(user)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return decodeSession(token)
}

// ============================================
// REGISTRO
// ============================================
export async function registrarCliente(
  celular: string,
  nombre: string,
  password: string
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  // Verificar si ya existe
  const existe = (await sql`
    SELECT id FROM usuarios WHERE celular = ${celular} LIMIT 1
  `) as any[]

  if (existe.length > 0) {
    return { ok: false, error: 'Este celular ya está registrado' }
  }

  const passwordHash = await hashPassword(password)

  const rows = (await sql`
    INSERT INTO usuarios (role, celular, password_hash, nombre)
    VALUES ('CUSTOMER', ${celular}, ${passwordHash}, ${nombre})
    RETURNING id, celular, nombre
  `) as any[]

  return {
    ok: true,
    user: {
      id: rows[0].id,
      role: 'CUSTOMER',
      celular: rows[0].celular,
      nombre: rows[0].nombre,
    },
  }
}

// ============================================
// LOGIN
// ============================================
export async function autenticarCliente(
  celular: string,
  password: string
): Promise<SessionUser | null> {
  const rows = (await sql`
    SELECT id, celular, nombre, password_hash
    FROM usuarios
    WHERE celular = ${celular} AND role = 'CUSTOMER' AND activo = TRUE
    LIMIT 1
  `) as any[]

  const user = rows[0]
  if (!user || !user.password_hash) return null

  const valido = await verifyPassword(password, user.password_hash)
  if (!valido) return null

  return {
    id: user.id,
    role: 'CUSTOMER',
    celular: user.celular,
    nombre: user.nombre,
  }
}

export { COOKIE_NAME }
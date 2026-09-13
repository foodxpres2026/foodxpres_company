import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { sql } from './db'

const COOKIE_NAME = 'foodxpres_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 días

export interface SessionUser {
  id: string
  role: 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER'
  email: string | null
  celular: string | null
  nombre: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET no está definido')
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  const signature = sign(payload)
  return `${payload}.${signature}`
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

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const rows = await sql<
    { id: string; role: string; email: string; password_hash: string; nombre: string }[]
  >`
    SELECT id, role, email, password_hash, nombre
    FROM usuarios
    WHERE email = ${email} AND role = 'ADMIN' AND activo = TRUE
    LIMIT 1
  `

  const user = rows[0]
  if (!user || !user.password_hash) return null

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return null

  return {
    id: user.id,
    role: user.role as SessionUser['role'],
    email: user.email,
    celular: null,
    nombre: user.nombre,
  }
}

export { COOKIE_NAME }
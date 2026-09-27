import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { sql } from './db'

const COOKIE_NAME = 'foodxpres_session'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 horas
const SESSION_AUDIENCE = 'foodxpres:web-admin:v1'

export interface SessionUser {
  id: string
  role: 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER'
  email: string | null
  celular: string | null
  nombre: string
}

type SessionPayload = { user: SessionUser; exp: number; version: number }
type AuthRow = { role: SessionUser['role']; activo: boolean; auth_version: string | number }

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function secret(): string {
  const value = process.env.AUTH_SECRET
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('AUTH_SECRET debe tener al menos 32 bytes')
  }
  return value
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(`${SESSION_AUDIENCE}\0${payload}`).digest('hex')
}

function encodeSession(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function decodeSession(token: string): SessionPayload | null {
  try {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return null
    const expected = Buffer.from(sign(payload), 'hex')
    const actual = Buffer.from(signature, 'hex')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload
    if (!data.user?.id || data.user.role !== 'ADMIN' || !Number.isFinite(data.exp) || data.exp <= Date.now() || !Number.isFinite(data.version)) return null
    return data
  } catch {
    return null
  }
}

export async function setSessionCookie(user: SessionUser) {
  const rows = (await sql`
    SELECT FLOOR(EXTRACT(EPOCH FROM actualizado_en) * 1000)::bigint AS auth_version
    FROM usuarios WHERE id = ${user.id} AND role = 'ADMIN' AND activo = TRUE LIMIT 1
  `) as { auth_version: string | number }[]
  if (!rows[0]) throw new Error('No se pudo crear la sesión')
  const token = encodeSession({ user, exp: Date.now() + SESSION_MAX_AGE * 1000, version: Number(rows[0].auth_version) })
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
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? decodeSession(token) : null
  if (session) {
    await sql`UPDATE usuarios SET actualizado_en = GREATEST(NOW(), actualizado_en + INTERVAL '1 millisecond') WHERE id = ${session.user.id} AND role = 'ADMIN'`
  }
  cookieStore.delete(COOKIE_NAME)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? decodeSession(token) : null
  if (!session) return null
  const rows = (await sql`
    SELECT role, activo, FLOOR(EXTRACT(EPOCH FROM actualizado_en) * 1000)::bigint AS auth_version
    FROM usuarios WHERE id = ${session.user.id} LIMIT 1
  `) as AuthRow[]
  const account = rows[0]
  if (!account || account.role !== 'ADMIN' || !account.activo || Number(account.auth_version) !== session.version) return null
  return session.user
}

export async function authenticateAdmin(email: string, password: string): Promise<SessionUser | null> {
  const rows = (await sql`
    SELECT id, role, email, password_hash, nombre
    FROM usuarios WHERE email = ${email} AND role = 'ADMIN' AND activo = TRUE LIMIT 1
  `) as any[]
  const user = rows[0]
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) return null
  return { id: user.id, role: 'ADMIN', email: user.email, celular: null, nombre: user.nombre }
}

export { COOKIE_NAME }

import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { sql } from './db'

const COOKIE_NAME = 'foodxpres_client'
const SESSION_MAX_AGE = 60 * 60 * 24 * 14 // 14 días
const SESSION_AUDIENCE = 'foodxpres:web-clientes:v1'

export interface SessionUser {
  id: string
  role: 'CUSTOMER'
  celular: string
  nombre: string
}

type SessionPayload = { user: SessionUser; exp: number; version: string }
type AuthRow = { role: string; activo: boolean; password_hash: string | null }

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

function sessionVersion(passwordHash: string): string {
  return createHmac('sha256', secret()).update(`${SESSION_AUDIENCE}\0password\0${passwordHash}`).digest('hex')
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
    if (!data.user?.id || data.user.role !== 'CUSTOMER' || !/^9\d{8}$/.test(data.user.celular) || !Number.isFinite(data.exp) || data.exp <= Date.now() || !/^[a-f0-9]{64}$/.test(data.version)) return null
    return data
  } catch {
    return null
  }
}

export async function setSessionCookie(user: SessionUser) {
  const rows = (await sql`
    SELECT password_hash
    FROM usuarios WHERE id = ${user.id} AND role = 'CUSTOMER' AND activo = TRUE LIMIT 1
  `) as { password_hash: string | null }[]
  if (!rows[0]?.password_hash) throw new Error('No se pudo crear la sesión')
  const token = encodeSession({ user, exp: Date.now() + SESSION_MAX_AGE * 1000, version: sessionVersion(rows[0].password_hash) })
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
  const session = token ? decodeSession(token) : null
  if (!session) return null
  const rows = (await sql`
    SELECT role, activo, password_hash
    FROM usuarios WHERE id = ${session.user.id} LIMIT 1
  `) as AuthRow[]
  const account = rows[0]
  if (!account || account.role !== 'CUSTOMER' || !account.activo || !account.password_hash || sessionVersion(account.password_hash) !== session.version) return null
  return session.user
}

export async function registrarCliente(celular: string, nombre: string, password: string): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const existe = (await sql`SELECT id FROM usuarios WHERE celular = ${celular} LIMIT 1`) as any[]
  if (existe.length > 0) return { ok: false, error: 'Este celular ya está registrado' }
  const passwordHash = await hashPassword(password)
  const rows = (await sql`
    INSERT INTO usuarios (role, celular, password_hash, nombre)
    VALUES ('CUSTOMER', ${celular}, ${passwordHash}, ${nombre})
    RETURNING id, celular, nombre
  `) as any[]
  return { ok: true, user: { id: rows[0].id, role: 'CUSTOMER', celular: rows[0].celular, nombre: rows[0].nombre } }
}

export async function autenticarCliente(celular: string, password: string): Promise<SessionUser | null> {
  const rows = (await sql`
    SELECT id, celular, nombre, password_hash FROM usuarios
    WHERE celular = ${celular} AND role = 'CUSTOMER' AND activo = TRUE LIMIT 1
  `) as any[]
  const user = rows[0]
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) return null
  return { id: user.id, role: 'CUSTOMER', celular: user.celular, nombre: user.nombre }
}

export { COOKIE_NAME }

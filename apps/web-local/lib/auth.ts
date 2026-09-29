import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getSql } from './db'

const COOKIE_NAME = 'foodxpres_local_session'
const SESSION_AUDIENCE = 'foodxpres:web-local:v1'
const SESSION_SECONDS = 60 * 60 * 24 * 30
export interface LocalUser { id: string; nombre: string; email: string; restauranteId: string; restauranteNombre: string }
type Session = { user: LocalUser; exp: number; version: string }

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || Buffer.byteLength(value, 'utf8') < 32) throw new Error('AUTH_SECRET debe tener al menos 32 caracteres')
  return value
}
function sign(payload: string) { return createHmac('sha256', secret()).update(`${SESSION_AUDIENCE}\0${payload}`).digest('hex') }
function sessionVersion(passwordHash: string) { return createHmac('sha256', secret()).update(`${SESSION_AUDIENCE}\0password\0${passwordHash}`).digest('hex') }
function encode(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}
function decode(token: string): Session | null {
  try {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return null
    const expected = Buffer.from(sign(payload), 'hex'), actual = Buffer.from(signature, 'hex')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session
    if (data.user?.id && data.user.restauranteId && Number.isFinite(data.exp) && data.exp > Date.now() && typeof data.version === 'string' && /^[a-f0-9]{64}$/.test(data.version)) return data
  } catch { return null }
  return null
}
export async function loginLocal(email: string, password: string): Promise<LocalUser | null> {
  const rows = await getSql()`
    SELECT u.id, u.nombre, u.email, u.password_hash, u.restaurante_id,
      r.nombre AS restaurante_nombre
    FROM usuarios u
    INNER JOIN restaurantes r ON r.id = u.restaurante_id
    WHERE LOWER(u.email) = ${email.toLowerCase()} AND u.role = 'STAFF' AND u.activo = TRUE
    LIMIT 1
  ` as any[]
  const row = rows[0]
  if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null
  const user: LocalUser = { id: row.id, nombre: row.nombre, email: row.email, restauranteId: row.restaurante_id, restauranteNombre: row.restaurante_nombre }
  const token = encode({ user, exp: Date.now() + SESSION_SECONDS * 1000, version: sessionVersion(row.password_hash) })
  const store = await cookies()
  store.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_SECONDS, path: '/' })
  return user
}
export async function getLocalSession(): Promise<LocalUser | null> {
  const store = await cookies(), token = store.get(COOKIE_NAME)?.value
  const session = token ? decode(token) : null
  if (!session) return null
  const rows = await getSql()`
    SELECT u.role, u.activo, u.restaurante_id, u.password_hash,
      r.nombre AS restaurante_nombre
    FROM usuarios u INNER JOIN restaurantes r ON r.id = u.restaurante_id
    WHERE u.id = ${session.user.id} LIMIT 1
  ` as any[]
  const account = rows[0]
  if (!account || account.role !== 'STAFF' || !account.activo || account.restaurante_id !== session.user.restauranteId || !account.password_hash || sessionVersion(account.password_hash) !== session.version) return null
  return { ...session.user, restauranteNombre: account.restaurante_nombre }
}
export async function logoutLocal() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

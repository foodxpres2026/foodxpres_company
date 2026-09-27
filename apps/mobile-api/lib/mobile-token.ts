import { createHmac, timingSafeEqual } from 'node:crypto'

export type MobileRole = 'STAFF' | 'DRIVER'
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 12

function getSecret() {
  const value = process.env.MOBILE_AUTH_SECRET
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('MOBILE_AUTH_SECRET debe tener al menos 32 bytes')
  }
  return value
}

function signature(payload: string) {
  return createHmac('sha256', getSecret()).update(`foodxpres:mobile:v1\0${payload}`).digest('base64url')
}

export function createMobileToken(input: { id: string; role: MobileRole; restaurantId?: string }) {
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    sub: input.id,
    role: input.role,
    ...(input.restaurantId ? { restaurantId: input.restaurantId } : {}),
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
    aud: 'foodxpres-mobile',
  })).toString('base64url')
  return { accessToken: `${payload}.${signature(payload)}`, expiresIn: TOKEN_LIFETIME_SECONDS }
}

export function verifyMobileToken(token: string, role: MobileRole) {
  const [payload, supplied, extra] = token.split('.')
  if (!payload || !supplied || extra) return null
  try {
    const expected = Buffer.from(signature(payload), 'base64url')
    const actual = Buffer.from(supplied, 'base64url')
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string; role?: string; restaurantId?: string; exp?: number; aud?: string
    }
    if (claims.aud !== 'foodxpres-mobile' || claims.role !== role || !claims.sub || !Number.isInteger(claims.exp) || claims.exp! <= Math.floor(Date.now() / 1000)) return null
    if (role === 'STAFF' && !claims.restaurantId) return null
    return claims
  } catch {
    return null
  }
}

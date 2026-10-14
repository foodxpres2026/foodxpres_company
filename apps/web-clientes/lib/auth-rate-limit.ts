import { createHmac } from 'crypto'

type AuthAction = 'login' | 'registro'

type RateLimitResult =
  | { status: 'allowed' }
  | { status: 'limited'; retryAfter: number }
  | { status: 'unavailable' }

type WindowConfig = { seconds: number; ipLimit: number; phoneLimit: number }

const CONFIG: Record<AuthAction, WindowConfig> = {
  login: { seconds: 15 * 60, ipLimit: 30, phoneLimit: 5 },
  registro: { seconds: 60 * 60, ipLimit: 10, phoneLimit: 3 },
}

const COUNTER_SCRIPT = `
local ipCount = redis.call('INCR', KEYS[1])
if ipCount == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local phoneCount = redis.call('INCR', KEYS[2])
if phoneCount == 1 then redis.call('EXPIRE', KEYS[2], ARGV[1]) end
return { ipCount, phoneCount, redis.call('TTL', KEYS[1]), redis.call('TTL', KEYS[2]) }
`

const localCounters = new Map<string, { count: number; expiresAt: number }>()

function digest(value: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AUTH_SECRET debe tener al menos 32 bytes')
  }
  return createHmac('sha256', secret).update(value).digest('hex')
}

function getClientIp(request: Request): string {
  // Vercel provides x-real-ip at the edge. x-forwarded-for is a fallback for
  // local development and other reverse proxies.
  return request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

function checkLocal(keys: string[], config: WindowConfig): RateLimitResult {
  const now = Date.now()
  for (const [key, counter] of localCounters) {
    if (counter.expiresAt <= now) localCounters.delete(key)
  }

  let retryAfter = 0
  for (const key of keys) {
    const counter = localCounters.get(key)
    if (counter && counter.count >= (key.includes(':ip:') ? config.ipLimit : config.phoneLimit)) {
      retryAfter = Math.max(retryAfter, Math.ceil((counter.expiresAt - now) / 1000))
    }
  }

  for (const key of keys) {
    const current = localCounters.get(key)
    if (current && current.expiresAt > now) current.count += 1
    else localCounters.set(key, { count: 1, expiresAt: now + config.seconds * 1000 })
  }

  return retryAfter > 0 ? { status: 'limited', retryAfter } : { status: 'allowed' }
}

export async function checkCustomerAuthRateLimit(
  request: Request,
  action: AuthAction,
  celular: string,
): Promise<RateLimitResult> {
  const config = CONFIG[action]
  const ipKey = `foodxpres:customer-auth:${action}:ip:${digest(getClientIp(request))}`
  const phoneKey = `foodxpres:customer-auth:${action}:phone:${digest(celular)}`
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '')
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    if (process.env.NODE_ENV !== 'production') return checkLocal([ipKey, phoneKey], config)
    return { status: 'unavailable' }
  }

  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        COUNTER_SCRIPT,
        2,
        ipKey,
        phoneKey,
        config.seconds,
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return { status: 'unavailable' }

    const payload = await response.json() as {
      result?: unknown
      error?: string
    }
    if (payload.error || !Array.isArray(payload.result) || payload.result.length !== 4) {
      return { status: 'unavailable' }
    }

    const [ipCount, phoneCount, ipTtl, phoneTtl] = payload.result.map(Number)
    if (![ipCount, phoneCount, ipTtl, phoneTtl].every(Number.isFinite)) {
      return { status: 'unavailable' }
    }

    if (ipCount > config.ipLimit || phoneCount > config.phoneLimit) {
      return { status: 'limited', retryAfter: Math.max(1, ipTtl, phoneTtl) }
    }

    return { status: 'allowed' }
  } catch {
    // Fail closed in production if the shared limiter cannot be reached.
    return process.env.NODE_ENV === 'production'
      ? { status: 'unavailable' }
      : checkLocal([ipKey, phoneKey], config)
  }
}

export function rateLimitResponse(result: Exclude<RateLimitResult, { status: 'allowed' }>) {
  const limited = result.status === 'limited'
  const retryAfter = limited ? result.retryAfter : 30
  return Response.json(
    {
      ok: false,
      error: limited
        ? 'Demasiados intentos. Espera un momento antes de volver a probar.'
        : 'El servicio de seguridad no está disponible. Inténtalo más tarde.',
    },
    {
      status: limited ? 429 : 503,
      headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
    },
  )
}

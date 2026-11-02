import { createHmac } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

const WINDOW_MINUTES = 15
const ACCOUNT_FAILURE_LIMIT = 5
const IP_FAILURE_LIMIT = 30

type LoginBucket = { hash: string; limit: number }

function hashBucket(scope: 'account' | 'ip', value: string) {
  const secret = process.env.AUTH_SECRET
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AUTH_SECRET debe tener al menos 32 bytes')
  }
  return createHmac('sha256', secret)
    .update(`foodxpres:web-clientes:login:${scope}:${value}`)
    .digest('hex')
}

function getBuckets(request: NextRequest, celular: string): LoginBucket[] {
  const buckets: LoginBucket[] = [
    { hash: hashBucket('account', celular), limit: ACCOUNT_FAILURE_LIMIT },
  ]
  const ip = request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  if (ip) buckets.push({ hash: hashBucket('ip', ip), limit: IP_FAILURE_LIMIT })
  return buckets
}

export async function isCustomerLoginBlocked(request: NextRequest, celular: string) {
  const buckets = getBuckets(request, celular)
  const results = await Promise.all(buckets.map(async ({ hash }) => {
    const rows = await sql`
      SELECT 1 FROM customer_login_attempt_limits
      WHERE bucket_hash = ${hash} AND blocked_until > NOW()
      LIMIT 1
    `
    return rows.length > 0
  }))
  return results.some(Boolean)
}

export async function recordCustomerLoginFailure(request: NextRequest, celular: string) {
  const buckets = getBuckets(request, celular)
  const results = await Promise.all(buckets.map(async ({ hash, limit }) => {
    const rows = await sql`
      INSERT INTO customer_login_attempt_limits (
        bucket_hash, failure_count, window_started_at, blocked_until, updated_at
      ) VALUES (${hash}, 1, NOW(), NULL, NOW())
      ON CONFLICT (bucket_hash) DO UPDATE SET
        failure_count = CASE
          WHEN customer_login_attempt_limits.window_started_at <= NOW() - (${WINDOW_MINUTES} * INTERVAL '1 minute') THEN 1
          ELSE customer_login_attempt_limits.failure_count + 1
        END,
        window_started_at = CASE
          WHEN customer_login_attempt_limits.window_started_at <= NOW() - (${WINDOW_MINUTES} * INTERVAL '1 minute') THEN NOW()
          ELSE customer_login_attempt_limits.window_started_at
        END,
        blocked_until = CASE
          WHEN customer_login_attempt_limits.window_started_at <= NOW() - (${WINDOW_MINUTES} * INTERVAL '1 minute') THEN NULL
          WHEN customer_login_attempt_limits.failure_count + 1 >= ${limit} THEN NOW() + (${WINDOW_MINUTES} * INTERVAL '1 minute')
          ELSE customer_login_attempt_limits.blocked_until
        END,
        updated_at = NOW()
      RETURNING blocked_until > NOW() AS blocked
    ` as { blocked: boolean }[]
    return rows[0]?.blocked === true
  }))

  await sql`
    WITH stale AS (
      SELECT bucket_hash
      FROM customer_login_attempt_limits
      WHERE updated_at < NOW() - INTERVAL '1 day'
      ORDER BY updated_at
      LIMIT 100
    )
    DELETE FROM customer_login_attempt_limits AS limits
    USING stale
    WHERE limits.bucket_hash = stale.bucket_hash
  `

  return results.some(Boolean)
}

export async function clearCustomerAccountLoginFailures(celular: string) {
  const hash = hashBucket('account', celular)
  await sql`DELETE FROM customer_login_attempt_limits WHERE bucket_hash = ${hash}`
}

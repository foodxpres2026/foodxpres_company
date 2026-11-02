import { NextRequest } from 'next/server'
import { z } from 'zod'
import { autenticarCliente, setSessionCookie } from '@/lib/auth'
import { clearCustomerAccountLoginFailures, isCustomerLoginBlocked, recordCustomerLoginFailure } from '@/lib/login-rate-limit'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/),
  password: z.string().min(1).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Datos inválidos'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { celular, password } = parsed.data
    if (await isCustomerLoginBlocked(req, celular)) {
      return Response.json(
        { ok: false, error: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      )
    }

    const user = await autenticarCliente(celular, password)

    if (!user) {
      const blocked = await recordCustomerLoginFailure(req, celular)
      if (blocked) {
        return Response.json(
          { ok: false, error: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' },
          { status: 429, headers: { 'Retry-After': '900' } },
        )
      }
      return Response.json(
        { ok: false, error: 'Celular o contraseña incorrectos' },
        { status: 401 }
      )
    }

    await clearCustomerAccountLoginFailures(celular)
    await setSessionCookie(user)
    return Response.json({ ok: true, user })
  } catch (error) {
    console.error('Login error:', error)
    return Response.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}

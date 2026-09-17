import { NextRequest } from 'next/server'
import { z } from 'zod'
import { autenticarCliente, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/),
  password: z.string().min(1),
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
    const user = await autenticarCliente(celular, password)

    if (!user) {
      return Response.json(
        { ok: false, error: 'Celular o contraseña incorrectos' },
        { status: 401 }
      )
    }

    await setSessionCookie(user)
    return Response.json({ ok: true, user })
  } catch (error) {
    console.error('Login error:', error)
    return Response.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
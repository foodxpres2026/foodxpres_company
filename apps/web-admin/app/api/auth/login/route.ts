import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateAdmin, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Contraseña inválida'),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ ok: false, error: 'Credenciales inválidas' }, { status: 400 })
    const { email, password } = parsed.data

    const user = await authenticateAdmin(email, password)
    if (!user) {
      return Response.json(
        { ok: false, error: 'Credenciales inválidas' },
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

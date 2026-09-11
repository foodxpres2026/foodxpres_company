import { NextRequest } from 'next/server'
import { authenticateAdmin, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return Response.json(
        { ok: false, error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      )
    }

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
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    )
  }
}
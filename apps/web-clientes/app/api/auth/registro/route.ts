import { NextRequest } from 'next/server'
import { z } from 'zod'
import { registrarCliente, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/, 'Celular debe ser 9 dígitos empezando con 9'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { celular, nombre, password } = parsed.data
    const result = await registrarCliente(celular, nombre, password)

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 409 })
    }

    await setSessionCookie(result.user)
    return Response.json({ ok: true, user: result.user }, { status: 201 })
  } catch (error) {
    console.error('Registro error:', error)
    return Response.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
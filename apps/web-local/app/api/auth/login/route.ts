import { z } from 'zod'
import { loginLocal } from '@/lib/auth'

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ ok: false, error: 'Ingresa un correo y contraseña válidos' }, { status: 400 })
    const user = await loginLocal(parsed.data.email, parsed.data.password)
    if (!user) return Response.json({ ok: false, error: 'Correo o contraseña incorrectos' }, { status: 401 })
    return Response.json({ ok: true, user }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Login de local falló:', error)
    return Response.json({ ok: false, error: 'No se pudo iniciar sesión. Revisa la configuración del servidor.' }, { status: 500 })
  }
}

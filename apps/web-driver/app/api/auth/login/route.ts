import { z } from 'zod'
import { loginDriver } from '@/lib/auth'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/),
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ ok: false, error: 'Ingresa un celular válido y tu contraseña' }, { status: 400 })
    const user = await loginDriver(parsed.data.celular, parsed.data.password)
    if (!user) return Response.json({ ok: false, error: 'Celular o contraseña incorrectos' }, { status: 401 })
    return Response.json({ ok: true, user }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Login de driver falló:', error)
    return Response.json({ ok: false, error: 'No se pudo iniciar sesión. Revisa la configuración del servidor.' }, { status: 500 })
  }
}

import { z } from 'zod'
import { getDriverSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

const schema = z.object({ token: z.string().min(20).max(4096) })

export async function POST(request: Request) {
  const user = await getDriverSession()
  if (!user) return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Token inválido' }, { status: 400 })
  try {
    await getSql()`
      INSERT INTO push_subscriptions (usuario_id, token, user_agent, activo)
      VALUES (${user.id}, ${parsed.data.token}, ${request.headers.get('user-agent')}, TRUE)
      ON CONFLICT (token) DO UPDATE SET usuario_id = ${user.id}, user_agent = EXCLUDED.user_agent,
        activo = TRUE, actualizado_en = NOW()
    `
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('POST driver push registration error:', error)
    return Response.json({ ok: false, error: 'No se pudo registrar el dispositivo' }, { status: 500 })
  }
}

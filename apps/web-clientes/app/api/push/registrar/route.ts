import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  token: z.string().min(10),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Token inválido' },
        { status: 400 }
      )
    }

    const { token } = parsed.data
    const userAgent = req.headers.get('user-agent') || null

    // Upsert: si el token ya existe, actualizar usuario y marcar activo
    await sql`
      INSERT INTO push_subscriptions (usuario_id, token, user_agent, activo)
      VALUES (${user.id}, ${token}, ${userAgent}, TRUE)
      ON CONFLICT (token) DO UPDATE SET
        usuario_id = ${user.id},
        user_agent = ${userAgent},
        activo = TRUE,
        actualizado_en = NOW()
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Registrar push error:', error)
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE → desactivar token (al cerrar sesión)
// ============================================
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return Response.json(
        { ok: false, error: 'Token requerido' },
        { status: 400 }
      )
    }

    await sql`
      UPDATE push_subscriptions
      SET activo = FALSE, actualizado_en = NOW()
      WHERE token = ${token} AND usuario_id = ${user.id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Desactivar push error:', error)
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    )
  }
}
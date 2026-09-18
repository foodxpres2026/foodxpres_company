import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  nombre: z.string().min(2).max(120),
})

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { nombre } = parsed.data

    await sql`
      UPDATE usuarios 
      SET nombre = ${nombre}, actualizado_en = NOW()
      WHERE id = ${user.id} AND role = 'CUSTOMER'
    `

    // Actualizar cookie (el nombre está en la sesión)
    await setSessionCookie({
      ...user,
      nombre,
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH perfil error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}
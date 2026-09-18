import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import {
  getSessionUser,
  verifyPassword,
  hashPassword,
} from '@/lib/auth'

const schema = z.object({
  password_actual: z.string().min(1, 'Ingresa tu contraseña actual'),
  password_nueva: z.string().min(6, 'Mínimo 6 caracteres'),
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

    const { password_actual, password_nueva } = parsed.data

    // Obtener hash actual
    const rows = (await sql`
      SELECT password_hash FROM usuarios 
      WHERE id = ${user.id} AND role = 'CUSTOMER'
      LIMIT 1
    `) as any[]

    if (rows.length === 0 || !rows[0].password_hash) {
      return Response.json(
        { ok: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar contraseña actual
    const valida = await verifyPassword(password_actual, rows[0].password_hash)
    if (!valida) {
      return Response.json(
        { ok: false, error: 'Contraseña actual incorrecta' },
        { status: 401 }
      )
    }

    // Actualizar
    const nuevoHash = await hashPassword(password_nueva)

    await sql`
      UPDATE usuarios 
      SET password_hash = ${nuevoHash}, actualizado_en = NOW()
      WHERE id = ${user.id} AND role = 'CUSTOMER'
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH password error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}
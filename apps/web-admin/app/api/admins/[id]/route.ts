import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const patchSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2).max(120),
  password: z.string().min(6).optional().or(z.literal('')),
  activo: z.boolean().default(true),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    // No permitir desactivarse a sí mismo
    if (id === user.id && d.activo === false) {
      return Response.json(
        { ok: false, error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      )
    }

    const dup = await sql`
      SELECT id FROM usuarios WHERE email = ${d.email} AND id != ${id} LIMIT 1
    `
    if (dup.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe otro usuario con ese email' },
        { status: 409 }
      )
    }

    if (d.password && d.password.length >= 6) {
      const hash = await bcrypt.hash(d.password, 10)
      await sql`
        UPDATE usuarios SET
          email = ${d.email},
          nombre = ${d.nombre},
          password_hash = ${hash},
          activo = ${d.activo},
          actualizado_en = NOW()
        WHERE id = ${id} AND role = 'ADMIN'
      `
    } else {
      await sql`
        UPDATE usuarios SET
          email = ${d.email},
          nombre = ${d.nombre},
          activo = ${d.activo},
          actualizado_en = NOW()
        WHERE id = ${id} AND role = 'ADMIN'
      `
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH admin error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  if (id === user.id) {
    return Response.json(
      { ok: false, error: 'No puedes desactivar tu propia cuenta' },
      { status: 400 }
    )
  }

  try {
    await sql`
      UPDATE usuarios 
      SET activo = FALSE, actualizado_en = NOW()
      WHERE id = ${id} AND role = 'ADMIN'
    `
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE admin error:', error)
    return Response.json(
      { ok: false, error: 'Error al desactivar' },
      { status: 500 }
    )
  }
}
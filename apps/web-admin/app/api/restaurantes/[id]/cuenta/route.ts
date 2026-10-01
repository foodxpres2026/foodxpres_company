import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const cuentaSchema = z.object({
  email: z.string().trim().email('Correo inválido').max(255),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionUser()
  if (!admin || admin.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id: restaurantId } = await params

  try {
    const parsed = cuentaSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const restaurantRows = await sql`
      SELECT id, nombre, usuario_id FROM restaurantes WHERE id = ${restaurantId} LIMIT 1
    `
    if (!restaurantRows.length) {
      return Response.json({ ok: false, error: 'Local no encontrado' }, { status: 404 })
    }
    const restaurant = restaurantRows[0] as { id: string; nombre: string; usuario_id: string | null }

    const linkedRows = await sql`
      SELECT id, role, restaurante_id FROM usuarios
      WHERE role = 'STAFF'
        AND (restaurante_id = ${restaurantId} OR id = ${restaurant.usuario_id})
      ORDER BY (restaurante_id = ${restaurantId}) DESC NULLS LAST
      LIMIT 1
    `
    const linked = linkedRows[0] as { id: string; role: string; restaurante_id: string | null } | undefined

    const emailOwnerRows = await sql`
      SELECT id FROM usuarios WHERE LOWER(email) = LOWER(${parsed.data.email}) LIMIT 1
    `
    const emailOwner = emailOwnerRows[0] as { id: string } | undefined
    if (emailOwner && emailOwner.id !== linked?.id) {
      return Response.json({ ok: false, error: 'Ese correo ya está asignado a otra cuenta' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    let accountId: string

    if (linked) {
      const updated = await sql`
        UPDATE usuarios
        SET email = ${parsed.data.email}, password_hash = ${passwordHash},
            nombre = ${restaurant.nombre}, restaurante_id = ${restaurantId}, activo = TRUE,
            actualizado_en = GREATEST(NOW(), actualizado_en + INTERVAL '1 millisecond')
        WHERE id = ${linked.id} AND role = 'STAFF'
        RETURNING id
      `
      accountId = (updated[0] as { id: string }).id
    } else {
      const inserted = await sql`
        INSERT INTO usuarios (role, email, password_hash, nombre, restaurante_id, activo)
        VALUES ('STAFF', ${parsed.data.email}, ${passwordHash}, ${restaurant.nombre}, ${restaurantId}, TRUE)
        RETURNING id
      `
      accountId = (inserted[0] as { id: string }).id
    }

    await sql`UPDATE restaurantes SET usuario_id = ${accountId}, actualizado_en = NOW() WHERE id = ${restaurantId}`

    return Response.json({ ok: true, email: parsed.data.email })
  } catch (error) {
    console.error('PUT cuenta de local error:', error)
    return Response.json({ ok: false, error: 'No se pudo guardar la cuenta del local' }, { status: 500 })
  }
}

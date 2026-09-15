import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const adminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(2).max(120),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, email, nombre, activo, creado_en
      FROM usuarios
      WHERE role = 'ADMIN'
      ORDER BY creado_en ASC
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET admins error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar admins' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = adminSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    const exists = await sql`
      SELECT id FROM usuarios WHERE email = ${d.email} LIMIT 1
    `
    if (exists.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe un usuario con ese email' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(d.password, 10)

    const inserted = await sql`
      INSERT INTO usuarios (role, email, password_hash, nombre)
      VALUES ('ADMIN', ${d.email}, ${passwordHash}, ${d.nombre})
      RETURNING id, email, nombre, activo, creado_en
    `

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST admin error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear admin' },
      { status: 500 }
    )
  }
}
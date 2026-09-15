import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const patchSchema = z.object({
  nombre: z.string().min(2).max(120),
  celular: z.string().regex(/^9\d{8}$/),
  vehiculo: z.string().max(60).optional().nullable(),
  placa: z.string().max(20).optional().nullable(),
  licencia: z.string().max(40).optional().nullable(),
  activo: z.boolean().default(true),
  disponible: z.boolean().default(true),
})

// PATCH → actualizar driver
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

    // Verificar celular único
    const dup = await sql`
      SELECT id FROM usuarios 
      WHERE celular = ${d.celular} AND id != ${id}
      LIMIT 1
    `
    if (dup.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe otro con ese celular' },
        { status: 409 }
      )
    }

    // Actualizar usuario
    await sql`
      UPDATE usuarios 
      SET nombre = ${d.nombre}, 
          celular = ${d.celular}, 
          activo = ${d.activo}, 
          actualizado_en = NOW()
      WHERE id = ${id} AND role = 'DRIVER'
    `

    // Actualizar detalles
    await sql`
      UPDATE driver_detalles 
      SET vehiculo = ${d.vehiculo || null},
          placa = ${d.placa || null},
          licencia = ${d.licencia || null},
          disponible = ${d.disponible},
          actualizado_en = NOW()
      WHERE usuario_id = ${id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH driver error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}

// DELETE → desactivar driver (soft)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    await sql`
      UPDATE usuarios 
      SET activo = FALSE, actualizado_en = NOW()
      WHERE id = ${id} AND role = 'DRIVER'
    `
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE driver error:', error)
    return Response.json(
      { ok: false, error: 'Error al desactivar' },
      { status: 500 }
    )
  }
}
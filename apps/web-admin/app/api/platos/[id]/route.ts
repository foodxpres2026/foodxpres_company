import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const patchSchema = z.object({
  subcategoria_id: z.string().uuid().nullable().optional(),
  nombre: z.string().min(2).max(120),
  descripcion: z.string().max(500).optional().nullable(),
  precio: z.coerce.number().min(0),
  imagen_url: z.string().url().optional().nullable().or(z.literal('')),
  tiempo_estimado: z.coerce.number().int().min(0).nullable().optional(),
  disponible: z.boolean().default(true),
})

// GET → detalle de un plato
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const rows = await sql`
      SELECT id, restaurante_id, subcategoria_id, nombre, descripcion,
             precio, imagen_url, tiempo_estimado, disponible, orden
      FROM platos
      WHERE id = ${id}
      LIMIT 1
    `

    if (rows.length === 0) {
      return Response.json(
        { ok: false, error: 'Plato no encontrado' },
        { status: 404 }
      )
    }

    return Response.json({ ok: true, data: rows[0] })
  } catch (error) {
    console.error('GET plato error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener plato' },
      { status: 500 }
    )
  }
}

// PATCH → actualizar plato
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

    // Verificar que el plato existe y obtener restaurante
    const existing = await sql`
      SELECT restaurante_id FROM platos WHERE id = ${id} LIMIT 1
    `
    if (existing.length === 0) {
      return Response.json(
        { ok: false, error: 'Plato no encontrado' },
        { status: 404 }
      )
    }

    const restauranteId = existing[0].restaurante_id

    // Verificar subcategoría si aplica
    if (d.subcategoria_id) {
      const sub = await sql`
        SELECT id FROM subcategorias 
        WHERE id = ${d.subcategoria_id} AND restaurante_id = ${restauranteId}
        LIMIT 1
      `
      if (sub.length === 0) {
        return Response.json(
          { ok: false, error: 'Subcategoría no válida' },
          { status: 400 }
        )
      }
    }

    await sql`
      UPDATE platos SET
        subcategoria_id = ${d.subcategoria_id || null},
        nombre = ${d.nombre},
        descripcion = ${d.descripcion || null},
        precio = ${d.precio},
        imagen_url = ${d.imagen_url || null},
        tiempo_estimado = ${d.tiempo_estimado ?? null},
        disponible = ${d.disponible},
        actualizado_en = NOW()
      WHERE id = ${id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH plato error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar plato' },
      { status: 500 }
    )
  }
}

// DELETE → eliminar plato
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
    await sql`DELETE FROM platos WHERE id = ${id}`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE plato error:', error)
    return Response.json(
      { ok: false, error: 'Error al eliminar plato' },
      { status: 500 }
    )
  }
}
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// PATCH → renombrar subcategoría
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
    const nombre = (body.nombre as string)?.trim()

    if (!nombre || nombre.length < 2) {
      return Response.json(
        { ok: false, error: 'Nombre inválido' },
        { status: 400 }
      )
    }

    // Verificar duplicado (excluyendo la misma)
    const dup = await sql`
      SELECT id, restaurante_id FROM subcategorias WHERE id = ${id} LIMIT 1
    `
    if (dup.length === 0) {
      return Response.json(
        { ok: false, error: 'Subcategoría no encontrada' },
        { status: 404 }
      )
    }

    const restauranteId = dup[0].restaurante_id

    const dupNombre = await sql`
      SELECT id FROM subcategorias
      WHERE restaurante_id = ${restauranteId} 
        AND LOWER(nombre) = LOWER(${nombre})
        AND id != ${id}
      LIMIT 1
    `
    if (dupNombre.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe otra con ese nombre' },
        { status: 409 }
      )
    }

    await sql`
      UPDATE subcategorias SET nombre = ${nombre} WHERE id = ${id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH subcategoria error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}

// DELETE → eliminar subcategoría (los platos quedan sin subcategoría)
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
    // Verificar si tiene platos
    const platos = await sql`
      SELECT COUNT(*)::int as total FROM platos WHERE subcategoria_id = ${id}
    `
    const total = platos[0]?.total ?? 0

    if (total > 0) {
      return Response.json(
        {
          ok: false,
          error: `No se puede eliminar: tiene ${total} plato${
            total === 1 ? '' : 's'
          } asignado${total === 1 ? '' : 's'}`,
        },
        { status: 409 }
      )
    }

    await sql`DELETE FROM subcategorias WHERE id = ${id}`

    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE subcategoria error:', error)
    return Response.json(
      { ok: false, error: 'Error al eliminar' },
      { status: 500 }
    )
  }
}
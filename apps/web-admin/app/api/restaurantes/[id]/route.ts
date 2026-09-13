import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { restauranteSchema } from '@/lib/validations/restaurante'

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
      SELECT id, slug, nombre, subtitulo, direccion_fisica, referencia,
             celular, lat, lng, tiempo_estimado, monto_minimo,
             banner_url, logo_url, activo, calificacion, num_resenas,
             creado_en, actualizado_en
      FROM restaurantes
      WHERE id = ${id}
      LIMIT 1
    `

    if (rows.length === 0) {
      return Response.json(
        { ok: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      )
    }

    const categorias = await sql`
      SELECT c.id, c.slug, c.nombre, c.emoji
      FROM categorias c
      INNER JOIN restaurantes_categorias rc ON rc.categoria_id = c.id
      WHERE rc.restaurante_id = ${id}
      ORDER BY c.nombre
    `

    return Response.json({
      ok: true,
      data: { ...rows[0], categorias },
    })
  } catch (error) {
    console.error('GET restaurante error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener restaurante' },
      { status: 500 }
    )
  }
}

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
    const parsed = restauranteSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    const dup = await sql`
      SELECT id FROM restaurantes
      WHERE slug = ${d.slug} AND id != ${id}
      LIMIT 1
    `
    if (dup.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe otro restaurante con ese slug' },
        { status: 409 }
      )
    }

    await sql`
      UPDATE restaurantes SET
        slug = ${d.slug},
        nombre = ${d.nombre},
        subtitulo = ${d.subtitulo || null},
        direccion_fisica = ${d.direccion_fisica},
        referencia = ${d.referencia || null},
        celular = ${d.celular || null},
        lat = ${d.lat ?? null},
        lng = ${d.lng ?? null},
        tiempo_estimado = ${d.tiempo_estimado || null},
        monto_minimo = ${d.monto_minimo},
        banner_url = ${d.banner_url || null},
        logo_url = ${d.logo_url || null},
        activo = ${d.activo},
        actualizado_en = NOW()
      WHERE id = ${id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH restaurante error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar restaurante' },
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

  try {
    await sql`
      UPDATE restaurantes
      SET activo = FALSE, actualizado_en = NOW()
      WHERE id = ${id}
    `
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE restaurante error:', error)
    return Response.json(
      { ok: false, error: 'Error al desactivar restaurante' },
      { status: 500 }
    )
  }
}
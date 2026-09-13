import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { restauranteSchema } from '@/lib/validations/restaurante'

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, slug, nombre, subtitulo, direccion_fisica, referencia,
             celular, lat, lng, tiempo_estimado, monto_minimo,
             banner_url, logo_url, activo, calificacion, num_resenas,
             creado_en, actualizado_en
      FROM restaurantes
      ORDER BY activo DESC, creado_en DESC
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET restaurantes error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar restaurantes' },
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
    const parsed = restauranteSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    const exists = await sql`
      SELECT id FROM restaurantes WHERE slug = ${d.slug} LIMIT 1
    `
    if (exists.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe un restaurante con ese slug' },
        { status: 409 }
      )
    }

    const inserted = await sql`
      INSERT INTO restaurantes (
        slug, nombre, subtitulo, direccion_fisica, referencia,
        celular, lat, lng, tiempo_estimado, monto_minimo,
        banner_url, logo_url, activo
      ) VALUES (
        ${d.slug}, ${d.nombre}, ${d.subtitulo || null},
        ${d.direccion_fisica}, ${d.referencia || null},
        ${d.celular || null}, ${d.lat ?? null}, ${d.lng ?? null},
        ${d.tiempo_estimado || null}, ${d.monto_minimo},
        ${d.banner_url || null}, ${d.logo_url || null}, ${d.activo}
      )
      RETURNING id, slug, nombre, activo, creado_en
    `

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST restaurantes error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear restaurante' },
      { status: 500 }
    )
  }
}
import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// GET → listar subcategorías de un restaurante
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
      SELECT id, nombre, orden, creado_en
      FROM subcategorias
      WHERE restaurante_id = ${id}
      ORDER BY orden, nombre
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET subcategorias error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar subcategorías' },
      { status: 500 }
    )
  }
}

// POST → crear subcategoría
export async function POST(
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
        { ok: false, error: 'Nombre inválido (mínimo 2 caracteres)' },
        { status: 400 }
      )
    }

    // Verificar duplicado
    const dup = await sql`
      SELECT id FROM subcategorias
      WHERE restaurante_id = ${id} AND LOWER(nombre) = LOWER(${nombre})
      LIMIT 1
    `
    if (dup.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe una subcategoría con ese nombre' },
        { status: 409 }
      )
    }

    // Obtener siguiente orden
    const maxOrden = await sql`
      SELECT COALESCE(MAX(orden), -1) + 1 as siguiente
      FROM subcategorias
      WHERE restaurante_id = ${id}
    `
    const orden = maxOrden[0]?.siguiente ?? 0

    const inserted = await sql`
      INSERT INTO subcategorias (restaurante_id, nombre, orden)
      VALUES (${id}, ${nombre}, ${orden})
      RETURNING id, nombre, orden, creado_en
    `

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST subcategorias error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear subcategoría' },
      { status: 500 }
    )
  }
}
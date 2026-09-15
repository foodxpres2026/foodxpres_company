import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const platoSchema = z.object({
  subcategoria_id: z.string().uuid().nullable().optional(),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  descripcion: z.string().max(500).optional().nullable(),
  precio: z.coerce.number().min(0),
  imagen_url: z.string().url().optional().nullable().or(z.literal('')),
  tiempo_estimado: z.coerce.number().int().min(0).nullable().optional(),
  disponible: z.boolean().default(true),
})

// GET → listar platos de un restaurante
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
      SELECT 
        p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
        p.tiempo_estimado, p.disponible, p.orden, p.subcategoria_id,
        s.nombre as subcategoria_nombre
      FROM platos p
      LEFT JOIN subcategorias s ON s.id = p.subcategoria_id
      WHERE p.restaurante_id = ${id}
      ORDER BY s.orden NULLS LAST, p.orden, p.nombre
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET platos error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar platos' },
      { status: 500 }
    )
  }
}

// POST → crear plato
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
    const parsed = platoSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    // Verificar que el restaurante existe
    const rest = await sql`SELECT id FROM restaurantes WHERE id = ${id} LIMIT 1`
    if (rest.length === 0) {
      return Response.json(
        { ok: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la subcategoría pertenece al restaurante
    if (d.subcategoria_id) {
      const sub = await sql`
        SELECT id FROM subcategorias 
        WHERE id = ${d.subcategoria_id} AND restaurante_id = ${id}
        LIMIT 1
      `
      if (sub.length === 0) {
        return Response.json(
          { ok: false, error: 'Subcategoría no válida' },
          { status: 400 }
        )
      }
    }

    // Obtener siguiente orden
    const maxOrden = await sql`
      SELECT COALESCE(MAX(orden), -1) + 1 as siguiente
      FROM platos WHERE restaurante_id = ${id}
    `

    const inserted = await sql`
      INSERT INTO platos (
        restaurante_id, subcategoria_id, nombre, descripcion,
        precio, imagen_url, tiempo_estimado, disponible, orden
      ) VALUES (
        ${id}, ${d.subcategoria_id || null}, ${d.nombre},
        ${d.descripcion || null}, ${d.precio},
        ${d.imagen_url || null}, ${d.tiempo_estimado ?? null},
        ${d.disponible}, ${maxOrden[0].siguiente}
      )
      RETURNING id, nombre, precio, disponible
    `

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST platos error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear plato' },
      { status: 500 }
    )
  }
}
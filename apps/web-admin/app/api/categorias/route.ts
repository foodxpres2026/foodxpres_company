import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  nombre: z.string().min(2).max(60),
  emoji: z.string().max(10).optional().nullable(),
  orden: z.coerce.number().int().min(0).default(0),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = (await sql`
      SELECT 
        c.id, c.slug, c.nombre, c.emoji, c.orden,
        (SELECT COUNT(*)::int FROM restaurantes_categorias 
         WHERE categoria_id = c.id) as num_restaurantes
      FROM categorias c
      ORDER BY c.orden, c.nombre
    `) as any[]
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET categorias error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar' },
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
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    const dup = await sql`
      SELECT id FROM categorias WHERE slug = ${d.slug} LIMIT 1
    `
    if (dup.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe una categoría con ese slug' },
        { status: 409 }
      )
    }

    const inserted = (await sql`
      INSERT INTO categorias (slug, nombre, emoji, orden)
      VALUES (${d.slug}, ${d.nombre}, ${d.emoji || null}, ${d.orden})
      RETURNING id, slug, nombre, emoji, orden
    `) as any[]

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST categoria error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear' },
      { status: 500 }
    )
  }
}
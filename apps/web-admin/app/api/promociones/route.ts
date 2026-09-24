import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  badge: z.string().max(40).optional().nullable(),
  titulo: z.string().min(2).max(80),
  subtitulo: z.string().max(120).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  cta_texto: z.string().max(40).optional().nullable(),
  imagen_url: z.string().url().optional().nullable().or(z.literal('')),
  gradiente_css: z.string().max(160).optional().nullable(),
  link_url: z.string().max(255).optional().nullable(),
  orden: z.coerce.number().int().min(0).default(0),
  activo: z.boolean().default(true),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, badge, titulo, subtitulo, descripcion, cta_texto,
             imagen_url, gradiente_css, link_url, orden, activo, creado_en
      FROM promociones
      ORDER BY orden ASC, creado_en DESC
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET promociones error:', error)
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

    const inserted = (await sql`
      INSERT INTO promociones (
        badge, titulo, subtitulo, descripcion, cta_texto,
        imagen_url, gradiente_css, link_url, orden, activo
      ) VALUES (
        ${d.badge || null}, ${d.titulo}, ${d.subtitulo || null},
        ${d.descripcion || null}, ${d.cta_texto || null},
        ${d.imagen_url || null}, ${d.gradiente_css || null},
        ${d.link_url || null}, ${d.orden}, ${d.activo}
      )
      RETURNING id, titulo, activo
    `) as any[]

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST promociones error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear' },
      { status: 500 }
    )
  }
}
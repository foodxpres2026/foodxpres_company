import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const patchSchema = z.object({
  badge: z.string().max(40).optional().nullable(),
  titulo: z.string().min(2).max(80),
  subtitulo: z.string().max(120).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  cta_texto: z.string().max(40).optional().nullable(),
  imagen_url: z.string().url().optional().nullable().or(z.literal('')),
  gradiente_css: z.string().max(160).optional().nullable(),
  orden: z.coerce.number().int().min(0).default(0),
  activo: z.boolean().default(true),
})

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

    await sql`
      UPDATE promociones SET
        badge = ${d.badge || null},
        titulo = ${d.titulo},
        subtitulo = ${d.subtitulo || null},
        descripcion = ${d.descripcion || null},
        cta_texto = ${d.cta_texto || null},
        imagen_url = ${d.imagen_url || null},
        gradiente_css = ${d.gradiente_css || null},
        orden = ${d.orden},
        activo = ${d.activo}
      WHERE id = ${id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH promocion error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
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
    await sql`DELETE FROM promociones WHERE id = ${id}`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE promocion error:', error)
    return Response.json(
      { ok: false, error: 'Error al eliminar' },
      { status: 500 }
    )
  }
}
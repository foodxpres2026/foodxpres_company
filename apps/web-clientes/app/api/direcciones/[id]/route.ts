import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const patchSchema = z.object({
  etiqueta: z.string().min(1).max(40),
  direccion: z.string().min(3).max(255),
  referencia: z.string().max(255).optional().nullable(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  es_predeterminada: z.boolean().optional(),
})

// PATCH → editar dirección
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
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

    // Verificar que la dirección es del usuario
    const existe = (await sql`
      SELECT id FROM direcciones WHERE id = ${id} AND usuario_id = ${user.id}
    `) as any[]

    if (existe.length === 0) {
      return Response.json(
        { ok: false, error: 'Dirección no encontrada' },
        { status: 404 }
      )
    }

    // Si se marca como predeterminada, quitar la anterior
    if (d.es_predeterminada) {
      await sql`
        UPDATE direcciones SET es_predeterminada = FALSE
        WHERE usuario_id = ${user.id} AND id != ${id}
      `
    }

    await sql`
      UPDATE direcciones SET
        etiqueta = ${d.etiqueta},
        direccion = ${d.direccion},
        referencia = ${d.referencia || null},
        lat = ${d.lat},
        lng = ${d.lng}
        ${d.es_predeterminada !== undefined ? sql`, es_predeterminada = ${d.es_predeterminada}` : sql``}
      WHERE id = ${id} AND usuario_id = ${user.id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH direccion error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}

// DELETE → eliminar dirección
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verificar que sea del usuario
    const existe = (await sql`
      SELECT id, es_predeterminada FROM direcciones 
      WHERE id = ${id} AND usuario_id = ${user.id}
    `) as any[]

    if (existe.length === 0) {
      return Response.json(
        { ok: false, error: 'Dirección no encontrada' },
        { status: 404 }
      )
    }

    const eraPredeterminada = existe[0].es_predeterminada

    await sql`
      DELETE FROM direcciones WHERE id = ${id} AND usuario_id = ${user.id}
    `

    // Si era la predeterminada, marcar la más reciente como predeterminada
    if (eraPredeterminada) {
      await sql`
        UPDATE direcciones SET es_predeterminada = TRUE
        WHERE id = (
          SELECT id FROM direcciones 
          WHERE usuario_id = ${user.id}
          ORDER BY creado_en DESC
          LIMIT 1
        )
      `
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE direccion error:', error)
    return Response.json(
      { ok: false, error: 'Error al eliminar' },
      { status: 500 }
    )
  }
}
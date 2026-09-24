import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const patchSchema = z.object({
  nombre: z.string().min(2).max(60),
  emoji: z.string().max(10).optional().nullable(),
  orden: z.coerce.number().int().min(0).default(0),
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
      UPDATE categorias SET
        nombre = ${d.nombre},
        emoji = ${d.emoji || null},
        orden = ${d.orden}
      WHERE id = ${id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH categoria error:', error)
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
    const count = (await sql`
      SELECT COUNT(*)::int as total 
      FROM restaurantes_categorias 
      WHERE categoria_id = ${id}
    `) as any[]

    if (count[0].total > 0) {
      return Response.json(
        {
          ok: false,
          error: `No se puede eliminar: ${count[0].total} restaurante(s) la usan`,
        },
        { status: 409 }
      )
    }

    await sql`DELETE FROM categorias WHERE id = ${id}`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DELETE categoria error:', error)
    return Response.json(
      { ok: false, error: 'Error al eliminar' },
      { status: 500 }
    )
  }
}
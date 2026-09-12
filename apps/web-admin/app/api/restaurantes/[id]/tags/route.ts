import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function PUT(
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
    const tagIds = body.tagIds as string[]

    if (!Array.isArray(tagIds)) {
      return Response.json(
        { ok: false, error: 'Formato inválido' },
        { status: 400 }
      )
    }

    await sql`DELETE FROM restaurantes_tags WHERE restaurante_id = ${id}`

    for (const tagId of tagIds) {
      await sql`
        INSERT INTO restaurantes_tags (restaurante_id, tag_id)
        VALUES (${id}, ${tagId})
        ON CONFLICT DO NOTHING
      `
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PUT tags error:', error)
    return Response.json(
      { ok: false, error: 'Error al guardar tags' },
      { status: 500 }
    )
  }
}
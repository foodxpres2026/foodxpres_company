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
    const categoriaIds = body.categoriaIds as string[]

    if (!Array.isArray(categoriaIds)) {
      return Response.json(
        { ok: false, error: 'Formato inválido' },
        { status: 400 }
      )
    }

    // Borrar las existentes
    await sql`
      DELETE FROM restaurantes_categorias WHERE restaurante_id = ${id}
    `

    // Insertar las nuevas
    for (const catId of categoriaIds) {
      await sql`
        INSERT INTO restaurantes_categorias (restaurante_id, categoria_id)
        VALUES (${id}, ${catId})
        ON CONFLICT DO NOTHING
      `
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PUT categorias error:', error)
    return Response.json(
      { ok: false, error: 'Error al guardar categorías' },
      { status: 500 }
    )
  }
}
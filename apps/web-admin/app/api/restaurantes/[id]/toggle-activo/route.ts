import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

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
    const rows = await sql`
      UPDATE restaurantes
      SET activo = NOT activo, actualizado_en = NOW()
      WHERE id = ${id}
      RETURNING id, activo
    `
    if (rows.length === 0) {
      return Response.json(
        { ok: false, error: 'No encontrado' },
        { status: 404 }
      )
    }
    return Response.json({ ok: true, data: rows[0] })
  } catch (error) {
    console.error('Toggle activo error:', error)
    return Response.json(
      { ok: false, error: 'Error al cambiar estado' },
      { status: 500 }
    )
  }
}
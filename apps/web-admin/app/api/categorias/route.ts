import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, slug, nombre, emoji
      FROM categorias
      ORDER BY orden, nombre
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET categorias error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar categorías' },
      { status: 500 }
    )
  }
}
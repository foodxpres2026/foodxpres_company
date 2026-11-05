import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT
        r.id AS restaurante_id,
        r.slug AS restaurante_slug,
        r.nombre AS restaurante_nombre,
        p.id AS plato_id,
        p.nombre AS plato_nombre
      FROM restaurantes r
      LEFT JOIN platos p ON p.restaurante_id = r.id AND p.disponible = TRUE
      WHERE r.activo = TRUE
      ORDER BY r.nombre, p.orden NULLS LAST, p.nombre
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET destinos de promociones error:', error)
    return Response.json(
      { ok: false, error: 'Error al cargar destinos de promociones' },
      { status: 500 }
    )
  }
}

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
        u.id,
        u.nombre,
        u.celular,
        u.activo,
        u.creado_en,
        (SELECT COUNT(*)::int FROM direcciones WHERE usuario_id = u.id) as num_direcciones,
        (
          SELECT COUNT(*)::int FROM pedidos WHERE usuario_id = u.id
        ) as num_pedidos,
        (
          SELECT COALESCE(SUM(total), 0)::numeric 
          FROM pedidos WHERE usuario_id = u.id
        ) as total_gastado
      FROM usuarios u
      WHERE u.role = 'CUSTOMER'
      ORDER BY u.creado_en DESC
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET clientes error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar clientes' },
      { status: 500 }
    )
  }
}
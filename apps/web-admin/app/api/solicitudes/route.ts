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
        s.id,
        s.celular,
        s.usuario_id,
        s.estado,
        s.notas,
        s.creado_en,
        s.atendido_en,
        u.nombre as cliente_nombre,
        a.nombre as atendido_por_nombre
      FROM solicitudes_recuperacion s
      LEFT JOIN usuarios u ON u.id = s.usuario_id
      LEFT JOIN usuarios a ON a.id = s.atendido_por
      WHERE s.estado = 'PENDIENTE'
      ORDER BY s.creado_en DESC
      LIMIT 50
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET solicitudes error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar' },
      { status: 500 }
    )
  }
}
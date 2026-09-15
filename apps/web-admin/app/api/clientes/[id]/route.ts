import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(
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
      SELECT id, nombre, celular, activo, creado_en
      FROM usuarios
      WHERE id = ${id} AND role = 'CUSTOMER'
      LIMIT 1
    `

    if (rows.length === 0) {
      return Response.json(
        { ok: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    const direcciones = await sql`
      SELECT id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
      FROM direcciones
      WHERE usuario_id = ${id}
      ORDER BY es_predeterminada DESC, creado_en DESC
    `

    const pedidos = await sql`
      SELECT 
        p.id,
        p.codigo,
        p.total,
        p.estado_global,
        p.creado_en
      FROM pedidos p
      WHERE p.usuario_id = ${id}
      ORDER BY p.creado_en DESC
      LIMIT 20
    `

    return Response.json({
      ok: true,
      data: { ...rows[0], direcciones, pedidos },
    })
  } catch (error) {
    console.error('GET cliente detalle error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener cliente' },
      { status: 500 }
    )
  }
}
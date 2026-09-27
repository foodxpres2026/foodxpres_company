import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getLocalStaff, localCorsHeaders } from '@/lib/local-auth'

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await getLocalStaff(req)
    if (!staff) {
      return Response.json({ ok: false, error: 'No autorizado' }, { status: 401, headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
    }
    const { id } = await params

    const updated = (await sql`
      UPDATE sub_pedidos SET
        estado = 'LISTO',
        listo_en = NOW()
      WHERE id = ${id}
        AND restaurante_id = ${staff.restaurantId}
        AND estado IN ('ACEPTADO', 'PREPARANDO')
      RETURNING id
    `) as any[]

    if (updated.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no disponible o todavía no aceptado' },
        { status: 409, headers: localCorsHeaders(req, 'PATCH, OPTIONS') }
      )
    }

    await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, 'LISTO', ${staff.id}, 'Pedido listo para recojo')
    `

    return Response.json({ ok: true }, { headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
  } catch (error) {
    console.error('Listo error:', error)
    return Response.json(
      { ok: false, error: 'Error' },
      { status: 500, headers: localCorsHeaders(req, 'PATCH, OPTIONS') }
    )
  }
}

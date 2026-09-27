import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getLocalStaff, localCorsHeaders } from '@/lib/local-auth'

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
}

const schema = z.object({
  motivo: z.string().max(200).optional().nullable(),
})

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
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ ok: false, error: 'Motivo inválido' }, { status: 400, headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
    }
    const motivo = parsed.data.motivo ?? null

    const updated = (await sql`
      UPDATE sub_pedidos SET
        estado = 'RECHAZADO',
        motivo_rechazo = ${motivo}
      WHERE id = ${id}
        AND restaurante_id = ${staff.restaurantId}
        AND estado = 'PENDIENTE'
      RETURNING id
    `) as any[]

    if (updated.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no disponible o ya procesado' },
        { status: 409, headers: localCorsHeaders(req, 'PATCH, OPTIONS') }
      )
    }

    await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, 'RECHAZADO', ${staff.id}, ${motivo || 'Rechazado por el local'})
    `

    return Response.json({ ok: true }, { headers: localCorsHeaders(req, 'PATCH, OPTIONS') })
  } catch (error) {
    console.error('Rechazar error:', error)
    return Response.json(
      { ok: false, error: 'Error al rechazar' },
      { status: 500, headers: localCorsHeaders(req, 'PATCH, OPTIONS') }
    )
  }
}

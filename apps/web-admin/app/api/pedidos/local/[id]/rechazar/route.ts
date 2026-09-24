import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

const schema = z.object({
  motivo: z.string().max(200).optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)

    const motivo = parsed.success ? parsed.data.motivo : null

    await sql`
      UPDATE sub_pedidos SET
        estado = 'RECHAZADO',
        motivo_rechazo = ${motivo}
      WHERE id = ${id}
    `

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Rechazar error:', error)
    return Response.json(
      { ok: false, error: 'Error al rechazar' },
      { status: 500, headers: corsHeaders }
    )
  }
}
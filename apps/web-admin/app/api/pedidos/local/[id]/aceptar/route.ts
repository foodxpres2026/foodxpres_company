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
  tiempo_estimado: z.coerce.number().int().min(1).max(180),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Tiempo inválido' },
        { status: 400, headers: corsHeaders }
      )
    }

    await sql`
      UPDATE sub_pedidos SET
        estado = 'ACEPTADO',
        tiempo_estimado = ${parsed.data.tiempo_estimado},
        aceptado_en = NOW()
      WHERE id = ${id}
    `

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Aceptar error:', error)
    return Response.json(
      { ok: false, error: 'Error al aceptar' },
      { status: 500, headers: corsHeaders }
    )
  }
}
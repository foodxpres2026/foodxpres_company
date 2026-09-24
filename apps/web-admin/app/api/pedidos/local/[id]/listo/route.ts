import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await sql`
      UPDATE sub_pedidos SET
        estado = 'LISTO',
        listo_en = NOW()
      WHERE id = ${id}
    `

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Listo error:', error)
    return Response.json(
      { ok: false, error: 'Error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
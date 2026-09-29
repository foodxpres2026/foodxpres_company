import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const paymentSchema = z.object({
  beneficiario_tipo: z.enum(['LOCAL', 'DRIVER']),
  beneficiario_id: z.string().uuid(),
  monto: z.coerce.number().finite().positive().max(10000000),
  nota: z.string().max(500).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const tipo = request.nextUrl.searchParams.get('tipo')
  const id = request.nextUrl.searchParams.get('id')
  if (!['LOCAL', 'DRIVER'].includes(tipo ?? '') || !id) return Response.json({ ok: false, error: 'Beneficiario inválido' }, { status: 400 })
  try {
    const rows = await sql`
      SELECT cp.id, cp.monto, cp.nota, cp.pagado_en, u.nombre AS admin_nombre
      FROM comision_pagos cp LEFT JOIN usuarios u ON u.id = cp.registrado_por
      WHERE cp.beneficiario_tipo = ${tipo} AND cp.beneficiario_id = ${id}::uuid
      ORDER BY cp.pagado_en DESC LIMIT 50
    `
    return Response.json({ ok: true, data: rows }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET comision payments error:', error)
    return Response.json({ ok: false, error: 'No se pudo cargar el historial de pagos.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Datos de pago inválidos' }, { status: 400 })
  try {
    const payment = parsed.data
    const rows = await sql`
      SELECT registrar_pago_comision(
        ${payment.beneficiario_tipo}, ${payment.beneficiario_id}::uuid,
        ${payment.monto}, ${user.id}::uuid, ${payment.nota ?? null}
      ) AS id
    ` as { id: string }[]
    return Response.json({ ok: true, data: { id: rows[0]?.id } }, { status: 201 })
  } catch (error) {
    console.error('POST comision payment error:', error)
    const message = error instanceof Error ? error.message : ''
    return Response.json({ ok: false, error: message.includes('saldo pendiente') ? message : 'No se pudo registrar el pago.' }, { status: message.includes('saldo pendiente') ? 400 : 500 })
  }
}

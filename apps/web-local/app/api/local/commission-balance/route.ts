import { getLocalSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export async function GET() {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida.' }, { status: 401 })
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT COALESCE((SELECT SUM(monto) FROM comisiones_generadas
        WHERE beneficiario_tipo = 'LOCAL' AND beneficiario_id = ${staff.restauranteId}), 0)
        - COALESCE((SELECT SUM(monto) FROM comision_pagos
        WHERE beneficiario_tipo = 'LOCAL' AND beneficiario_id = ${staff.restauranteId}), 0) AS saldo
    ` as { saldo: string | number }[]
    return Response.json({ ok: true, data: { saldo: Number(rows[0]?.saldo ?? 0) } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET local commission balance error:', error)
    return Response.json({ ok: false, error: 'No se pudo cargar el saldo de comisiones.' }, { status: 500 })
  }
}

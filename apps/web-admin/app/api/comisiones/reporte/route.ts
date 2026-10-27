import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const localId = request.nextUrl.searchParams.get('localId')
  if (!localId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(localId)) return Response.json({ ok: false, error: 'Selecciona un local válido.' }, { status: 400 })

  try {
    const [locals, charges, payments] = await Promise.all([
      sql`SELECT id, nombre FROM restaurantes WHERE id = ${localId}::uuid LIMIT 1`,
      sql`
        SELECT cg.id, cg.base, cg.modalidad, cg.valor_regla, cg.monto, cg.creado_en,
               p.codigo AS pedido_codigo, sp.tipo_pedido
        FROM comisiones_generadas cg
        INNER JOIN sub_pedidos sp ON sp.id = cg.sub_pedido_id
        INNER JOIN pedidos p ON p.id = sp.pedido_id
        WHERE cg.beneficiario_tipo = 'LOCAL' AND cg.beneficiario_id = ${localId}::uuid
        ORDER BY cg.creado_en, p.codigo
      `,
      sql`
        SELECT cp.id, cp.monto, cp.nota, cp.pagado_en, u.nombre AS admin_nombre
        FROM comision_pagos cp LEFT JOIN usuarios u ON u.id = cp.registrado_por
        WHERE cp.beneficiario_tipo = 'LOCAL' AND cp.beneficiario_id = ${localId}::uuid
        ORDER BY cp.pagado_en
      `,
    ])
    if (!locals.length) return Response.json({ ok: false, error: 'No se encontró el local seleccionado.' }, { status: 404 })
    const totalComisiones = charges.reduce((sum: number, row: any) => sum + Number(row.monto), 0)
    const totalPagos = payments.reduce((sum: number, row: any) => sum + Number(row.monto), 0)
    return Response.json({ ok: true, data: { local: locals[0], charges, payments, total_comisiones: totalComisiones, total_pagos: totalPagos, saldo: totalComisiones - totalPagos, generado_en: new Date().toISOString() } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET comisiones report error:', error)
    return Response.json({ ok: false, error: 'No se pudo generar el reporte de comisiones.' }, { status: 500 })
  }
}

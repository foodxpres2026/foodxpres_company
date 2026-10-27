import { getLocalSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })

  try {
    const sql = getSql()
    const [locals, charges, payments] = await Promise.all([
      sql`SELECT id, nombre FROM restaurantes WHERE id = ${staff.restauranteId}::uuid LIMIT 1`,
      sql`
        SELECT cg.id, cg.base, cg.modalidad, cg.valor_regla, cg.monto, cg.creado_en,
               p.codigo AS pedido_codigo, sp.tipo_pedido
        FROM comisiones_generadas cg
        INNER JOIN sub_pedidos sp ON sp.id = cg.sub_pedido_id
        INNER JOIN pedidos p ON p.id = sp.pedido_id
        WHERE cg.beneficiario_tipo = 'LOCAL' AND cg.beneficiario_id = ${staff.restauranteId}::uuid
        ORDER BY cg.creado_en, p.codigo
      `,
      sql`
        SELECT cp.id, cp.monto, cp.nota, cp.pagado_en, u.nombre AS admin_nombre
        FROM comision_pagos cp LEFT JOIN usuarios u ON u.id = cp.registrado_por
        WHERE cp.beneficiario_tipo = 'LOCAL' AND cp.beneficiario_id = ${staff.restauranteId}::uuid
        ORDER BY cp.pagado_en
      `,
    ])
    const totalComisiones = charges.reduce((sum: number, row: any) => sum + Number(row.monto), 0)
    const totalPagos = payments.reduce((sum: number, row: any) => sum + Number(row.monto), 0)
    return Response.json({ ok: true, data: { local: locals[0] ?? { id: staff.restauranteId, nombre: staff.restauranteNombre }, charges, payments, total_comisiones: totalComisiones, total_pagos: totalPagos, saldo: totalComisiones - totalPagos, generado_en: new Date().toISOString() } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET local commission report error:', error)
    return Response.json({ ok: false, error: 'No se pudo generar el reporte de comisiones.' }, { status: 500 })
  }
}

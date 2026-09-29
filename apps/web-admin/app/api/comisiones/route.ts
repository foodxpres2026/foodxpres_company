import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const ruleSchema = z.object({
  beneficiario_tipo: z.enum(['LOCAL', 'DRIVER']),
  restaurante_id: z.string().uuid().nullable().optional(),
  modalidad: z.enum(['FIJA', 'PORCENTAJE']),
  valor: z.coerce.number().finite().min(0).max(100000),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  try {
    const [restaurants, drivers, rules, localRules, charges] = await Promise.all([
      sql`
        SELECT r.id, r.nombre,
          (SELECT json_build_object('id', cr.id, 'modalidad', cr.modalidad, 'valor', cr.valor, 'creado_en', cr.creado_en)
           FROM comision_reglas cr WHERE cr.beneficiario_tipo = 'LOCAL' AND cr.restaurante_id = r.id
           ORDER BY cr.creado_en DESC LIMIT 1) AS regla,
          COALESCE((SELECT SUM(cg.monto) FROM comisiones_generadas cg WHERE cg.beneficiario_tipo = 'LOCAL' AND cg.beneficiario_id = r.id), 0)
          - COALESCE((SELECT SUM(cp.monto) FROM comision_pagos cp WHERE cp.beneficiario_tipo = 'LOCAL' AND cp.beneficiario_id = r.id), 0) AS saldo
        FROM restaurantes r ORDER BY r.nombre
      `,
      sql`
        SELECT u.id, u.nombre, u.celular,
          COALESCE((SELECT SUM(cg.monto) FROM comisiones_generadas cg WHERE cg.beneficiario_tipo = 'DRIVER' AND cg.beneficiario_id = u.id), 0)
          - COALESCE((SELECT SUM(cp.monto) FROM comision_pagos cp WHERE cp.beneficiario_tipo = 'DRIVER' AND cp.beneficiario_id = u.id), 0) AS saldo
        FROM usuarios u WHERE u.role = 'DRIVER' ORDER BY u.nombre
      `,
      sql`
        SELECT id, modalidad, valor, creado_en FROM comision_reglas
        WHERE beneficiario_tipo = 'DRIVER' ORDER BY creado_en DESC LIMIT 20
      `,
      sql`
        SELECT cr.id, cr.restaurante_id, r.nombre AS restaurante_nombre,
               cr.modalidad, cr.valor, cr.creado_en
        FROM comision_reglas cr INNER JOIN restaurantes r ON r.id = cr.restaurante_id
        WHERE cr.beneficiario_tipo = 'LOCAL'
        ORDER BY cr.creado_en DESC LIMIT 100
      `,
      sql`
        SELECT cg.id, cg.beneficiario_tipo, cg.beneficiario_id, cg.base,
               cg.modalidad, cg.valor_regla, cg.monto, cg.creado_en,
               p.codigo AS pedido_codigo,
               CASE WHEN cg.beneficiario_tipo = 'LOCAL' THEN r.nombre ELSE d.nombre END AS beneficiario_nombre
        FROM comisiones_generadas cg
        INNER JOIN sub_pedidos sp ON sp.id = cg.sub_pedido_id
        INNER JOIN pedidos p ON p.id = sp.pedido_id
        LEFT JOIN restaurantes r ON cg.beneficiario_tipo = 'LOCAL' AND r.id = cg.beneficiario_id
        LEFT JOIN usuarios d ON cg.beneficiario_tipo = 'DRIVER' AND d.id = cg.beneficiario_id
        ORDER BY cg.creado_en DESC LIMIT 100
      `,
    ])
    return Response.json({ ok: true, data: { restaurants, drivers, driverRules: rules, localRules, charges } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET comisiones error:', error)
    return Response.json({ ok: false, error: 'No se pudieron cargar las comisiones. Aplica primero la migración 003.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const parsed = ruleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Regla inválida' }, { status: 400 })
  const rule = parsed.data
  if ((rule.beneficiario_tipo === 'DRIVER' && (rule.modalidad !== 'PORCENTAJE' || rule.restaurante_id)) ||
      (rule.beneficiario_tipo === 'LOCAL' && !rule.restaurante_id) ||
      (rule.modalidad === 'PORCENTAJE' && rule.valor > 100)) {
    return Response.json({ ok: false, error: 'La modalidad o el valor no corresponde al beneficiario.' }, { status: 400 })
  }
  try {
    const rows = await sql`
      INSERT INTO comision_reglas (beneficiario_tipo, restaurante_id, modalidad, valor, creado_por)
      VALUES (${rule.beneficiario_tipo}, ${rule.restaurante_id ?? null}, ${rule.modalidad}, ${rule.valor}, ${user.id})
      RETURNING id, beneficiario_tipo, restaurante_id, modalidad, valor, creado_en
    `
    return Response.json({ ok: true, data: rows[0] }, { status: 201 })
  } catch (error) {
    console.error('POST comisiones error:', error)
    return Response.json({ ok: false, error: 'No se pudo guardar la regla. Aplica primero la migración 003.' }, { status: 500 })
  }
}

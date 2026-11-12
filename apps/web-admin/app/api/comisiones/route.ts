import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const ruleSchema = z.object({
  beneficiario_tipo: z.enum(['LOCAL', 'DRIVER']),
  restaurante_id: z.string().uuid().nullable().optional(),
  tipo_pedido: z.enum(['NORMAL', 'AUTOPEDIDO']).optional(),
  modalidad: z.enum(['FIJA', 'PORCENTAJE']),
  valor: z.coerce.number().finite().min(0).max(100000),
})

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const codigoPedido = request.nextUrl.searchParams.get('codigo')?.trim() ?? ''
  const beneficiarioTipoRaw = request.nextUrl.searchParams.get('beneficiario_tipo')
  const beneficiarioTipo = beneficiarioTipoRaw && ['LOCAL', 'DRIVER'].includes(beneficiarioTipoRaw) ? beneficiarioTipoRaw : null
  const beneficiarioIdRaw = request.nextUrl.searchParams.get('beneficiario_id')
  const beneficiarioId = beneficiarioIdRaw && /^[0-9a-f-]{36}$/i.test(beneficiarioIdRaw) ? beneficiarioIdRaw : null
  const desdeRaw = request.nextUrl.searchParams.get('desde') ?? ''
  const hastaRaw = request.nextUrl.searchParams.get('hasta') ?? ''
  const fechaValida = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }
  const desde = fechaValida(desdeRaw) ? desdeRaw : null
  const hasta = fechaValida(hastaRaw) ? hastaRaw : null
  if (beneficiarioTipoRaw && !beneficiarioTipo) return Response.json({ ok: false, error: 'Tipo de beneficiario inválido' }, { status: 400 })
  if (beneficiarioIdRaw && !beneficiarioId) return Response.json({ ok: false, error: 'Beneficiario inválido' }, { status: 400 })
  if ((desdeRaw && !desde) || (hastaRaw && !hasta) || (desde && hasta && desde > hasta)) return Response.json({ ok: false, error: 'Rango de fechas inválido' }, { status: 400 })
  const cargosFiltrados = Boolean(codigoPedido || beneficiarioTipo || beneficiarioId || desde || hasta)
  try {
    const [restaurants, drivers, rules, localRules, charges] = await Promise.all([
      sql`
        SELECT r.id, r.nombre,
          (SELECT json_build_object('id', cr.id, 'modalidad', cr.modalidad, 'valor', cr.valor, 'creado_en', cr.creado_en)
           FROM comision_reglas cr WHERE cr.beneficiario_tipo = 'LOCAL' AND cr.restaurante_id = r.id AND cr.tipo_pedido = 'NORMAL'
           ORDER BY cr.creado_en DESC LIMIT 1) AS regla,
          (SELECT json_build_object('id', cr.id, 'modalidad', cr.modalidad, 'valor', cr.valor, 'creado_en', cr.creado_en)
           FROM comision_reglas cr WHERE cr.beneficiario_tipo = 'LOCAL' AND cr.restaurante_id = r.id AND cr.tipo_pedido = 'AUTOPEDIDO'
           ORDER BY cr.creado_en DESC LIMIT 1) AS regla_autopedido,
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
               cr.tipo_pedido, cr.modalidad, cr.valor, cr.creado_en
        FROM comision_reglas cr INNER JOIN restaurantes r ON r.id = cr.restaurante_id
        WHERE cr.beneficiario_tipo = 'LOCAL'
        ORDER BY cr.creado_en DESC LIMIT 100
      `,
      sql`
        SELECT cg.id, cg.beneficiario_tipo, cg.beneficiario_id, cg.base,
               cg.modalidad, cg.valor_regla, cg.monto, cg.creado_en,
               p.codigo AS pedido_codigo,
               sp.tipo_pedido,
               CASE WHEN cg.beneficiario_tipo = 'LOCAL' THEN r.nombre ELSE d.nombre END AS beneficiario_nombre
        FROM comisiones_generadas cg
        INNER JOIN sub_pedidos sp ON sp.id = cg.sub_pedido_id
        INNER JOIN pedidos p ON p.id = sp.pedido_id
        LEFT JOIN restaurantes r ON cg.beneficiario_tipo = 'LOCAL' AND r.id = cg.beneficiario_id
        LEFT JOIN usuarios d ON cg.beneficiario_tipo = 'DRIVER' AND d.id = cg.beneficiario_id
        WHERE p.codigo ILIKE ${`%${codigoPedido}%`}
          AND (${beneficiarioTipo}::text IS NULL OR cg.beneficiario_tipo = ${beneficiarioTipo})
          AND (${beneficiarioId}::uuid IS NULL OR cg.beneficiario_id = ${beneficiarioId}::uuid)
          AND (${desde}::date IS NULL OR cg.creado_en >= (${desde}::date::timestamp AT TIME ZONE 'America/Lima'))
          AND (${hasta}::date IS NULL OR cg.creado_en < ((${hasta}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Lima'))
        ORDER BY cg.creado_en DESC LIMIT ${cargosFiltrados ? 100 : 5}
      `,
    ])
    return Response.json({ ok: true, data: { restaurants, drivers, driverRules: rules, localRules, charges } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET comisiones error:', error)
    return Response.json({ ok: false, error: 'No se pudieron cargar las comisiones. Revisa que estén aplicadas las migraciones 003 y 006.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  const parsed = ruleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Regla inválida' }, { status: 400 })
  const rule = parsed.data
  if ((rule.beneficiario_tipo === 'DRIVER' && (rule.modalidad !== 'PORCENTAJE' || rule.restaurante_id || rule.tipo_pedido === 'AUTOPEDIDO')) ||
      (rule.beneficiario_tipo === 'LOCAL' && !rule.restaurante_id) ||
      (rule.modalidad === 'PORCENTAJE' && rule.valor > 100)) {
    return Response.json({ ok: false, error: 'La modalidad o el valor no corresponde al beneficiario.' }, { status: 400 })
  }
  try {
    const rows = await sql`
      INSERT INTO comision_reglas (beneficiario_tipo, restaurante_id, tipo_pedido, modalidad, valor, creado_por)
      VALUES (${rule.beneficiario_tipo}, ${rule.restaurante_id ?? null}, ${rule.beneficiario_tipo === 'LOCAL' ? (rule.tipo_pedido ?? 'NORMAL') : 'NORMAL'}, ${rule.modalidad}, ${rule.valor}, ${user.id})
      RETURNING id, beneficiario_tipo, restaurante_id, tipo_pedido, modalidad, valor, creado_en
    `
    return Response.json({ ok: true, data: rows[0] }, { status: 201 })
  } catch (error) {
    console.error('POST comisiones error:', error)
    return Response.json({ ok: false, error: 'No se pudo guardar la regla. Revisa que estén aplicadas las migraciones 003 y 006.' }, { status: 500 })
  }
}

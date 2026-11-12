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
  if ((!tipo && id) || (tipo && !id) || (tipo && !['LOCAL', 'DRIVER'].includes(tipo)) || (id && !/^[0-9a-f-]{36}$/i.test(id))) return Response.json({ ok: false, error: 'Beneficiario inválido' }, { status: 400 })
  const filtroTipoRaw = request.nextUrl.searchParams.get('filtro_tipo')
  const filtroTipo = filtroTipoRaw && ['LOCAL', 'DRIVER'].includes(filtroTipoRaw) ? filtroTipoRaw : null
  const busqueda = (request.nextUrl.searchParams.get('beneficiario') || '').trim().slice(0, 80)
  const desdeRaw = request.nextUrl.searchParams.get('desde') ?? ''
  const hastaRaw = request.nextUrl.searchParams.get('hasta') ?? ''
  const fechaValida = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }
  const desde = fechaValida(desdeRaw) ? desdeRaw : null
  const hasta = fechaValida(hastaRaw) ? hastaRaw : null
  if (filtroTipoRaw && !filtroTipo) return Response.json({ ok: false, error: 'Tipo de beneficiario inválido' }, { status: 400 })
  if ((desdeRaw && !desde) || (hastaRaw && !hasta) || (desde && hasta && desde > hasta)) return Response.json({ ok: false, error: 'Rango de fechas inválido' }, { status: 400 })
  const historialFiltrado = Boolean(filtroTipo || busqueda || desde || hasta)
  try {
    const rows = await sql`
      SELECT cp.id, cp.beneficiario_tipo, cp.beneficiario_id, cp.monto, cp.nota, cp.pagado_en,
             u.nombre AS admin_nombre,
             CASE WHEN cp.beneficiario_tipo = 'LOCAL' THEN r.nombre ELSE d.nombre END AS beneficiario_nombre
      FROM comision_pagos cp
      LEFT JOIN usuarios u ON u.id = cp.registrado_por
      LEFT JOIN restaurantes r ON cp.beneficiario_tipo = 'LOCAL' AND r.id = cp.beneficiario_id
      LEFT JOIN usuarios d ON cp.beneficiario_tipo = 'DRIVER' AND d.id = cp.beneficiario_id
      WHERE (${tipo}::text IS NULL OR cp.beneficiario_tipo = ${tipo})
        AND (${id}::uuid IS NULL OR cp.beneficiario_id = ${id}::uuid)
        AND (${filtroTipo}::text IS NULL OR cp.beneficiario_tipo = ${filtroTipo})
        AND (${busqueda} = '' OR COALESCE(r.nombre, d.nombre, '') ILIKE '%' || ${busqueda} || '%')
        AND (${desde}::date IS NULL OR cp.pagado_en >= (${desde}::date::timestamp AT TIME ZONE 'America/Lima'))
        AND (${hasta}::date IS NULL OR cp.pagado_en < ((${hasta}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Lima'))
      ORDER BY cp.pagado_en DESC LIMIT ${tipo && id ? 50 : historialFiltrado ? 100 : 5}
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

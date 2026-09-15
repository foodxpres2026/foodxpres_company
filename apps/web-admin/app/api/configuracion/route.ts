import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const configSchema = z.object({
  tarifa_base: z.coerce.number().min(0),
  precio_por_km: z.coerce.number().min(0),
  costo_vip: z.coerce.number().min(0),
  monto_minimo_global: z.coerce.number().min(0),
  tiempo_max_aceptacion: z.coerce.number().int().min(1),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT tarifa_base, precio_por_km, costo_vip, 
             monto_minimo_global, tiempo_max_aceptacion, actualizado_en
      FROM configuracion_sistema
      WHERE id = 1
      LIMIT 1
    `
    return Response.json({ ok: true, data: rows[0] })
  } catch (error) {
    console.error('GET config error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = configSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    await sql`
      UPDATE configuracion_sistema SET
        tarifa_base = ${d.tarifa_base},
        precio_por_km = ${d.precio_por_km},
        costo_vip = ${d.costo_vip},
        monto_minimo_global = ${d.monto_minimo_global},
        tiempo_max_aceptacion = ${d.tiempo_max_aceptacion},
        actualizado_en = NOW()
      WHERE id = 1
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH config error:', error)
    return Response.json(
      { ok: false, error: 'Error al guardar' },
      { status: 500 }
    )
  }
}
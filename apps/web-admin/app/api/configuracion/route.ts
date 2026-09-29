import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const configSchema = z.object({
  tarifa_delivery_metodo: z.enum(['DETALLADA', 'GENERAL']),
  costo_vip: z.coerce.number().min(0),
  tiempo_max_aceptacion: z.coerce.number().int().min(1),
})

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT tarifa_delivery_metodo, costo_vip,
             tiempo_max_aceptacion, actualizado_en
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
        tarifa_delivery_metodo = ${d.tarifa_delivery_metodo},
        costo_vip = ${d.costo_vip},
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

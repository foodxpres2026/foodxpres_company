import { z } from 'zod'
import { getDriverSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

const schema = z.object({ disponible: z.boolean() })

export async function PATCH(request: Request) {
  const driver = await getDriverSession()
  if (!driver) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Estado de disponibilidad inválido' }, { status: 400 })
  try {
    const sql = getSql()
    const rows = await sql`
      UPDATE driver_detalles SET disponible = ${parsed.data.disponible}, actualizado_en = NOW()
      WHERE usuario_id = ${driver.id} RETURNING disponible
    ` as { disponible: boolean }[]
    if (!rows.length) return Response.json({ ok: false, error: 'No se encontró tu perfil de driver' }, { status: 404 })
    return Response.json({ ok: true, disponible: rows[0].disponible })
  } catch (error) {
    console.error('PATCH driver/availability error:', error)
    return Response.json({ ok: false, error: 'No se pudo actualizar tu disponibilidad' }, { status: 500 })
  }
}

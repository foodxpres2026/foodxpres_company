import { z } from 'zod'
import { getLocalSession } from '@/lib/auth'
import { calculateLocalShipping } from '@/lib/autopedido'

const schema = z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) })
export async function POST(req: Request) {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Ingresa una ubicación válida del cliente.' }, { status: 400 })
  try {
    const result = await calculateLocalShipping(staff.restauranteId, parsed.data.lat, parsed.data.lng)
    return Response.json({ ok: true, data: {
      costo: result.costo,
      distancia_km: result.distancia_km,
      duracion_min: result.duracion_min,
      fuente: result.fuente,
      permitido: result.permitido,
      ...(result.razon ? { razon: result.razon } : {}),
    } }, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch (error) { return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No se pudo calcular el envío.' }, { status: 422 }) }
}

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { calcularEnvio } from '@/lib/envio/calcular'

const schema = z.object({
  restaurante_ids: z.array(z.string().uuid()),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { restaurante_ids, lat, lng } = parsed.data

    // Calcular en paralelo
    const resultados = await Promise.all(
      restaurante_ids.map(async (id) => {
        const r = await calcularEnvio(id, lat, lng)
        return {
          restaurante_id: id,
          costo: r?.costo ?? null,
          distancia_km: r?.distancia_km ?? null,
          duracion_min: r?.duracion_min ?? null,
        }
      })
    )

    return Response.json({ ok: true, data: resultados })
  } catch (error) {
    console.error('Error cálculo masivo:', error)
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    )
  }
}
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { calcularEnvio } from '@/lib/envio/calcular'

const schema = z.object({
  restaurante_id: z.string().uuid(),
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

    const { restaurante_id, lat, lng } = parsed.data

    const resultado = await calcularEnvio(restaurante_id, lat, lng)

    if (!resultado) {
      return Response.json(
        { ok: false, error: 'No se pudo calcular el envío' },
        { status: 404 }
      )
    }

    return Response.json({ ok: true, data: resultado })
  } catch (error) {
    console.error('Error cálculo envío:', error)
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    )
  }
}
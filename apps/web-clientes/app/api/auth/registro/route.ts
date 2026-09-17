import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { registrarCliente, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/, 'Celular debe ser 9 dígitos empezando con 9'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  direccion_temporal: z
    .object({
      etiqueta: z.string().max(40),
      direccion: z.string().max(255),
      referencia: z.string().max(255).optional().nullable(),
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    })
    .optional()
    .nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message || 'Datos inválidos',
        },
        { status: 400 }
      )
    }

    const { celular, nombre, password, direccion_temporal } = parsed.data
    const result = await registrarCliente(celular, nombre, password)

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 409 })
    }

    // Si venía con dirección temporal, guardarla en la BD
    if (direccion_temporal) {
      try {
        await sql`
          INSERT INTO direcciones (
            usuario_id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
          ) VALUES (
            ${result.user.id},
            ${direccion_temporal.etiqueta || 'Casa'},
            ${direccion_temporal.direccion},
            ${direccion_temporal.referencia || null},
            ${direccion_temporal.lat},
            ${direccion_temporal.lng},
            TRUE
          )
        `
      } catch (err) {
        console.error('Error al guardar dirección temporal:', err)
        // No fallamos el registro si esto falla
      }
    }

    await setSessionCookie(result.user)
    return Response.json({ ok: true, user: result.user }, { status: 201 })
  } catch (error) {
    console.error('Registro error:', error)
    return Response.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
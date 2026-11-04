import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { registrarCliente, setSessionCookie } from '@/lib/auth'
import { firebaseConfig } from '@/lib/firebase/config-values'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/, 'Celular debe ser 9 dígitos empezando con 9'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  password: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos'),
  firebase_id_token: z.string().min(1).max(5000),
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
}).strict()

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

    const { celular, nombre, password, firebase_id_token, direccion_temporal } = parsed.data

    // Firebase verifica el token en su backend y devuelve el teléfono asociado.
    // Nunca confiamos en un indicador enviado por el navegador.
    let firebaseResponse: Response
    try {
      firebaseResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: firebase_id_token }),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      )
    } catch {
      return Response.json(
        { ok: false, error: 'No se pudo confirmar el celular. Intenta nuevamente.' },
        { status: 503 },
      )
    }

    if (!firebaseResponse.ok) {
      let firebaseErrorCode = ''
      try {
        const firebaseError = await firebaseResponse.json() as { error?: { message?: string } }
        firebaseErrorCode = firebaseError.error?.message || ''
      } catch {}
      const tokenInvalid = firebaseResponse.status === 400
        && (firebaseErrorCode.includes('INVALID_ID_TOKEN') || firebaseErrorCode.includes('USER_NOT_FOUND'))
      const status = tokenInvalid ? 401 : 503
      return Response.json(
        {
          ok: false,
          error: status === 401
            ? 'La verificación venció o no es válida. Solicita un nuevo código.'
            : 'No se pudo confirmar el celular. Intenta nuevamente.',
        },
        { status },
      )
    }

    const firebaseData = await firebaseResponse.json() as {
      users?: Array<{ phoneNumber?: string }>
    }
    const telefonoVerificado = firebaseData.users?.[0]?.phoneNumber
    if (telefonoVerificado !== `+51${celular}`) {
      return Response.json(
        { ok: false, error: 'El celular verificado no coincide con el número del registro.' },
        { status: 401 },
      )
    }

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

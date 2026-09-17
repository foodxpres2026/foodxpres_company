import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const schema = z.object({
  celular: z.string().regex(/^9\d{8}$/, 'Celular inválido'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Celular inválido' },
        { status: 400 }
      )
    }

    const { celular } = parsed.data

    // Buscar usuario (solo si existe, para linkearlo)
    const user = await sql`
      SELECT id FROM usuarios
      WHERE celular = ${celular} AND role = 'CUSTOMER' AND activo = TRUE
      LIMIT 1
    `

    const usuarioId = user.length > 0 ? user[0].id : null

    // Verificar si ya hay una solicitud pendiente reciente (últimos 5 min)
    const pendiente = await sql`
      SELECT id, creado_en
      FROM solicitudes_recuperacion
      WHERE celular = ${celular}
        AND estado = 'PENDIENTE'
        AND creado_en > NOW() - INTERVAL '5 minutes'
      LIMIT 1
    `

    if (pendiente.length > 0) {
      return Response.json({
        ok: true,
        message:
          'Ya recibimos tu solicitud. Te contactaremos por WhatsApp en breve.',
      })
    }

    // Crear solicitud
    await sql`
      INSERT INTO solicitudes_recuperacion (celular, usuario_id, estado)
      VALUES (${celular}, ${usuarioId}, 'PENDIENTE')
    `

    // TODO: notificar al admin (por ahora solo se ve en su dashboard)

    return Response.json({
      ok: true,
      message:
        'Recibimos tu solicitud. Te contactaremos por WhatsApp al ' +
        celular +
        ' en breve.',
    })
  } catch (error) {
    console.error('Recuperar error:', error)
    return Response.json(
      { ok: false, error: 'Error interno' },
      { status: 500 }
    )
  }
}
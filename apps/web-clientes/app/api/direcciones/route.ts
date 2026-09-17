import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  etiqueta: z.string().min(1).max(40),
  direccion: z.string().min(3).max(255),
  referencia: z.string().max(255).optional().nullable(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  es_predeterminada: z.boolean().default(false),
})

// GET → listar direcciones del cliente
export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = (await sql`
      SELECT id, etiqueta, direccion, referencia, lat, lng,
             es_predeterminada, creado_en
      FROM direcciones
      WHERE usuario_id = ${user.id}
      ORDER BY es_predeterminada DESC, creado_en DESC
    `) as any[]

    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET direcciones error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar direcciones' },
      { status: 500 }
    )
  }
}

// POST → crear dirección
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    // Si se marca como predeterminada, quitar la predeterminada anterior
    if (d.es_predeterminada) {
      await sql`
        UPDATE direcciones SET es_predeterminada = FALSE
        WHERE usuario_id = ${user.id}
      `
    }

    // Si es la primera dirección, marcarla como predeterminada automáticamente
    const count = (await sql`
      SELECT COUNT(*)::int as total FROM direcciones WHERE usuario_id = ${user.id}
    `) as any[]

    const esPrimera = count[0].total === 0

    const inserted = (await sql`
      INSERT INTO direcciones (
        usuario_id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
      ) VALUES (
        ${user.id}, ${d.etiqueta}, ${d.direccion}, ${d.referencia || null},
        ${d.lat}, ${d.lng}, ${d.es_predeterminada || esPrimera}
      )
      RETURNING id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
    `) as any[]

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST direcciones error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear dirección' },
      { status: 500 }
    )
  }
}
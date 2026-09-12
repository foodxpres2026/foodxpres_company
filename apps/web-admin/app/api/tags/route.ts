import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, texto FROM tags ORDER BY texto
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET tags error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar tags' },
      { status: 500 }
    )
  }
}

// POST → crear tag nuevo
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const texto = (body.texto as string)?.trim()

    if (!texto || texto.length < 2) {
      return Response.json(
        { ok: false, error: 'Texto inválido' },
        { status: 400 }
      )
    }

    const rows = await sql`
      INSERT INTO tags (texto) VALUES (${texto})
      ON CONFLICT (texto) DO UPDATE SET texto = EXCLUDED.texto
      RETURNING id, texto
    `
    return Response.json({ ok: true, data: rows[0] })
  } catch (error) {
    console.error('POST tags error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear tag' },
      { status: 500 }
    )
  }
}
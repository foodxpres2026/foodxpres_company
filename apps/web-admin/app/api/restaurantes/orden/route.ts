import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const ids: unknown = body?.ids
    if (
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== 'string' || !UUID_RE.test(id)) ||
      new Set(ids).size !== ids.length
    ) {
      return Response.json({ ok: false, error: 'Orden de locales inválido' }, { status: 400 })
    }

    const currentRows = await sql`SELECT id FROM restaurantes`
    const currentIds = new Set(currentRows.map((row) => String(row.id)))
    if (ids.length !== currentIds.size || ids.some((id) => !currentIds.has(id as string))) {
      return Response.json(
        { ok: false, error: 'La lista de locales cambió. Actualiza la página e inténtalo de nuevo.' },
        { status: 409 }
      )
    }

    await sql.transaction(
      ids.map((id, orden) => sql`
        UPDATE restaurantes
        SET orden_inicio = ${orden}, actualizado_en = NOW()
        WHERE id = ${id}
      `)
    )

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH orden de restaurantes error:', error)
    return Response.json({ ok: false, error: 'Error al guardar el orden de locales' }, { status: 500 })
  }
}

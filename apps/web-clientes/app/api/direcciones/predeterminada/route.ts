import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  direccion_id: z.string().uuid(),
})

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { direccion_id } = parsed.data

    // Verificar que la dirección es del usuario
    const existe = (await sql`
      SELECT id FROM direcciones 
      WHERE id = ${direccion_id} AND usuario_id = ${user.id}
    `) as any[]

    if (existe.length === 0) {
      return Response.json(
        { ok: false, error: 'Dirección no encontrada' },
        { status: 404 }
      )
    }

    // Quitar todas las predeterminadas
    await sql`
      UPDATE direcciones SET es_predeterminada = FALSE
      WHERE usuario_id = ${user.id}
    `

    // Marcar la nueva
    await sql`
      UPDATE direcciones SET es_predeterminada = TRUE
      WHERE id = ${direccion_id}
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH predeterminada error:', error)
    return Response.json(
      { ok: false, error: 'Error al actualizar' },
      { status: 500 }
    )
  }
}
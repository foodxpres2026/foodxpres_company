import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const estadoSchema = z.object({
  estado: z.enum([
    'PENDIENTE',
    'ACEPTADO',
    'PREPARANDO',
    'LISTO',
    'ASIGNADO',
    'EN_CAMINO',
    'ENTREGADO',
    'RECHAZADO',
    'CANCELADO',
  ]),
  notas: z.string().max(500).optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = estadoSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { estado, notas } = parsed.data

    // Verificar que existe
    const exists = await sql`SELECT id FROM sub_pedidos WHERE id = ${id} LIMIT 1`
    if (exists.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Actualizar estado + timestamp correspondiente
    switch (estado) {
      case 'ACEPTADO':
        await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, aceptado_en = ${now}
          WHERE id = ${id}
        `
        break
      case 'LISTO':
        await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, listo_en = ${now}
          WHERE id = ${id}
        `
        break
      case 'EN_CAMINO':
        await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, recogido_en = ${now}
          WHERE id = ${id}
        `
        break
      case 'ENTREGADO':
        await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}, entregado_en = ${now}
          WHERE id = ${id}
        `
        break
      default:
        await sql`
          UPDATE sub_pedidos 
          SET estado = ${estado}
          WHERE id = ${id}
        `
    }

    // Registrar en historial
    await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, ${estado}, ${user.id}, ${notas || null})
    `

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH estado error:', error)
    return Response.json(
      { ok: false, error: 'Error al cambiar estado' },
      { status: 500 }
    )
  }
}
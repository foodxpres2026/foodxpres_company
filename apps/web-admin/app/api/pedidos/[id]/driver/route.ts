import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { recalcularPedido } from '@/lib/pedidos-utils'
import { asignarPropinaAlDriver } from '@/lib/pedidos/propinas'

const driverSchema = z.object({
  driver_id: z.string().uuid().nullable(),
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
    const parsed = driverSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { driver_id, notas } = parsed.data

    // Verificar que el sub_pedido existe y obtener driver actual
    const existing = await sql`
      SELECT sp.id, sp.estado, sp.driver_id, u.nombre as driver_actual_nombre
      FROM sub_pedidos sp
      LEFT JOIN usuarios u ON u.id = sp.driver_id
      WHERE sp.id = ${id}
      LIMIT 1
    `

    if (existing.length === 0) {
      return Response.json(
        { ok: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    const driverAnterior = existing[0].driver_id
    const driverAnteriorNombre = existing[0].driver_actual_nombre

    // Verificar que el driver nuevo existe (si no es null)
    let driverNuevoNombre = null
    if (driver_id) {
      const driverRow = await sql`
        SELECT id, nombre FROM usuarios 
        WHERE id = ${driver_id} AND role = 'DRIVER' AND activo = TRUE
        LIMIT 1
      `
      if (driverRow.length === 0) {
        return Response.json(
          { ok: false, error: 'Driver no válido o inactivo' },
          { status: 400 }
        )
      }
      driverNuevoNombre = driverRow[0].nombre
    }

    // Actualizar el driver
    await sql`
      UPDATE sub_pedidos 
      SET driver_id = ${driver_id}
      WHERE id = ${id}
    `
    // 🎁 Asignar propina al primer driver que tome un pedido
    if (driver_id) {
      await asignarPropinaAlDriver(id)
    }
    // Registrar en historial
    let notaHistorial = notas || ''
    if (driverAnterior !== driver_id) {
      if (!driverAnterior && driver_id) {
        notaHistorial = `Asignado a ${driverNuevoNombre}`
      } else if (driverAnterior && !driver_id) {
        notaHistorial = `Desasignado de ${driverAnteriorNombre}`
      } else {
        notaHistorial = `Reasignado de ${driverAnteriorNombre} a ${driverNuevoNombre}`
      }
      if (notas) notaHistorial += ` · ${notas}`
    }

    await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, ${existing[0].estado}, ${user.id}, ${notaHistorial})
    `
    // 🔄 RECALCULAR PEDIDO PADRE (por si acaso)
    const spInfo = await sql`
      SELECT pedido_id FROM sub_pedidos WHERE id = ${id} LIMIT 1
    `
    if (spInfo.length > 0) {
      await recalcularPedido(spInfo[0].pedido_id)
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PATCH driver error:', error)
    return Response.json(
      { ok: false, error: 'Error al reasignar driver' },
      { status: 500 }
    )
  }
}
import { getDriverSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const driver = await getDriverSession()
  if (!driver) return Response.json({ ok: false, error: 'Sesión vencida. Vuelve a ingresar.' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'Pedido inválido' }, { status: 400 })

  try {
    const sql = getSql()
    const updated = await sql`
      UPDATE sub_pedidos sp SET
        driver_id = ${driver.id},
        estado = CASE WHEN sp.estado = 'LISTO' THEN 'ASIGNADO' ELSE sp.estado END
      WHERE sp.id = ${id} AND sp.estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO') AND sp.driver_id IS NULL
        AND EXISTS (SELECT 1 FROM driver_detalles d WHERE d.usuario_id = ${driver.id} AND d.disponible = TRUE)
        AND NOT EXISTS (SELECT 1 FROM sub_pedidos active WHERE active.driver_id = ${driver.id} AND active.estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO'))
      RETURNING sp.id, sp.estado
    ` as any[]
    if (!updated.length) return Response.json({ ok: false, error: 'El pedido ya fue tomado o ya tienes un pedido reservado/en curso.' }, { status: 409 })
    await sql`INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas) VALUES (${id}, ${updated[0].estado}, ${driver.id}, 'Pedido reservado por el driver')`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('POST driver/orders/take error:', error)
    return Response.json({ ok: false, error: 'No se pudo tomar el pedido' }, { status: 500 })
  }
}

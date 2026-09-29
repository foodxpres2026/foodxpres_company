import { getLocalSession } from '@/lib/auth'
import { getSql } from '@/lib/db'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getLocalSession()
  if (!staff) return Response.json({ ok: false, error: 'Sesión vencida.' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 })
  const sql = getSql()
  try {
    const result = await sql`
      SELECT confirmar_entrega_subpedido(${id}::uuid, ${staff.id}::uuid, 'LOCAL', NULL) AS pedido_id
    `
    return Response.json({ ok: true, data: result[0] })
  } catch (error) {
    console.error('POST local confirm delivery error:', error)
    return Response.json({ ok: false, error: 'No se pudo confirmar el autopedido.' }, { status: 409 })
  }
}

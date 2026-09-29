import { getSessionUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return Response.json({ ok: false, error: 'Inicia sesión para confirmar la entrega.' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 })
  try {
    await sql`SELECT confirmar_entrega_subpedido(${id}::uuid, ${user.id}::uuid, 'CLIENTE', NULL)`
    return Response.json({ ok: true })
  } catch (error) {
    console.error('POST confirmar entrega error:', error)
    const message = error instanceof Error ? error.message : ''
    return Response.json({ ok: false, error: message.includes('todavía no espera') ? 'El driver aún no ha marcado que llegó al cliente.' : 'No se pudo confirmar la entrega.' }, { status: message.includes('todavía no espera') ? 409 : 500 })
  }
}

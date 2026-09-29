import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getDriver, localCorsHeaders, localCorsJson } from '@/lib/local-auth'

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: localCorsHeaders(req, 'POST, OPTIONS') })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const driver = await getDriver(req)
  if (!driver) return localCorsJson(req, { ok: false, error: 'No autorizado' }, { status: 401 }, 'POST, OPTIONS')

  try {
    const { id } = await params
    const updated = (await sql`SELECT tomar_pedido_driver(${id}::uuid, ${driver.id}::uuid, TRUE) AS estado`) as { estado: string }[]

    await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, ${updated[0].estado}, ${driver.id}, 'Pedido aceptado por el driver')
    `
    return localCorsJson(req, { ok: true }, {}, 'POST, OPTIONS')
  } catch (error) {
    console.error('Tomar pedido error:', error)
    if (error instanceof Error && /máximo de 2|ya tomado|desconectado|no disponible|deuda vencida|deuda pendiente/i.test(error.message)) return localCorsJson(req, { ok: false, error: error.message }, { status: 409 }, 'POST, OPTIONS')
    return localCorsJson(req, { ok: false, error: 'No se pudo tomar el pedido' }, { status: 500 }, 'POST, OPTIONS')
  }
}

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
    const updated = (await sql`
      UPDATE sub_pedidos sp SET
        driver_id = ${driver.id},
        driver_asignado_en = NOW(),
        estado = 'ASIGNADO'
      WHERE sp.id = ${id}
        AND sp.estado = 'LISTO'
        AND sp.driver_id IS NULL
        AND EXISTS (
          SELECT 1 FROM driver_detalles d
          WHERE d.usuario_id = ${driver.id} AND d.disponible = TRUE
        )
        AND NOT EXISTS (
          SELECT 1 FROM sub_pedidos active
          WHERE active.driver_id = ${driver.id}
            AND active.estado IN ('ASIGNADO', 'EN_CAMINO')
        )
      RETURNING sp.id
    `) as any[]

    if (updated.length === 0) {
      return localCorsJson(req, { ok: false, error: 'El pedido ya fue tomado o no estás disponible' }, { status: 409 }, 'POST, OPTIONS')
    }

    await sql`
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (${id}, 'ASIGNADO', ${driver.id}, 'Pedido aceptado por el driver')
    `
    return localCorsJson(req, { ok: true }, {}, 'POST, OPTIONS')
  } catch (error) {
    console.error('Tomar pedido error:', error)
    return localCorsJson(req, { ok: false, error: 'No se pudo tomar el pedido' }, { status: 500 }, 'POST, OPTIONS')
  }
}

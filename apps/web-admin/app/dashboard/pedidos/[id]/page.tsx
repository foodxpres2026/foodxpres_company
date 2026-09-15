import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import PedidoDetalle from '../_components/pedido-detalle'

async function getPedido(id: string) {
  const spRows = await sql`
    SELECT 
      sp.*,
      p.codigo as pedido_codigo,
      p.propina,
      p.vip,
      p.costo_vip,
      p.notas as pedido_notas,
      p.total as pedido_total,
      u.nombre as cliente_nombre,
      u.celular as cliente_celular,
      r.nombre as restaurante_nombre,
      r.celular as restaurante_celular,
      d.id as driver_id,
      d.nombre as driver_nombre,
      d.celular as driver_celular
    FROM sub_pedidos sp
    INNER JOIN pedidos p ON p.id = sp.pedido_id
    INNER JOIN usuarios u ON u.id = p.usuario_id
    INNER JOIN restaurantes r ON r.id = sp.restaurante_id
    LEFT JOIN usuarios d ON d.id = sp.driver_id
    WHERE sp.id = ${id}
    LIMIT 1
  `

  if (spRows.length === 0) return null
  const pedido = spRows[0] as any

  const items = await sql`
    SELECT id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas
    FROM pedido_items
    WHERE sub_pedido_id = ${id}
    ORDER BY id
  `

  const itemsConOpciones = await Promise.all(
    items.map(async (item: any) => {
      const opciones = await sql`
        SELECT grupo_titulo_snapshot, choice_nombre_snapshot, precio_extra
        FROM item_opciones
        WHERE item_id = ${item.id}
      `
      return { ...item, opciones }
    })
  )

  const historial = await sql`
    SELECT 
      h.estado,
      h.notas,
      h.creado_en,
      u.nombre as cambiado_por_nombre
    FROM pedido_estado_historial h
    LEFT JOIN usuarios u ON u.id = h.cambiado_por
    WHERE h.sub_pedido_id = ${id}
    ORDER BY h.creado_en ASC
  `

  return { ...pedido, items: itemsConOpciones, historial }
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400',
  ACEPTADO: 'bg-blue-500/15 text-blue-400',
  PREPARANDO: 'bg-purple-500/15 text-purple-400',
  LISTO: 'bg-cyan-500/15 text-cyan-400',
  ASIGNADO: 'bg-indigo-500/15 text-indigo-400',
  EN_CAMINO: 'bg-orange-500/15 text-orange-400',
  ENTREGADO: 'bg-brand/15 text-brand',
  RECHAZADO: 'bg-red-500/15 text-red-400',
  CANCELADO: 'bg-gray-500/15 text-gray-400',
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pedido = await getPedido(id)

  if (!pedido) notFound()

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/pedidos"
          className="text-sm text-gray-500 hover:text-brand"
        >
          ← Volver a pedidos
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {pedido.pedido_codigo}
          </h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              ESTADO_COLORES[pedido.estado] || ESTADO_COLORES.PENDIENTE
            }`}
          >
            {pedido.estado.replace('_', ' ')}
          </span>
          {pedido.vip && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
              ⭐ VIP
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Creado{' '}
          {new Date(pedido.creado_en).toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <PedidoDetalle pedido={pedido as any} />
    </div>
  )
}
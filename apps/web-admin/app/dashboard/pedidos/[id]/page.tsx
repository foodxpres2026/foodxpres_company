import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import PedidoDetalleMulti from '../_components/pedido-detalle-multi'

async function getPedido(pedidoId: string) {
  // Pedido padre + cliente
  const pedidoRows = await sql`
    SELECT 
      p.*,
      u.nombre as cliente_nombre,
      u.celular as cliente_celular
    FROM pedidos p
    INNER JOIN usuarios u ON u.id = p.usuario_id
    WHERE p.id = ${pedidoId}
    LIMIT 1
  `
  if (pedidoRows.length === 0) return null
  const pedido = pedidoRows[0] as any

  // Sub-pedidos con restaurante y driver
  const subs = await sql`
    SELECT 
      sp.id,
      sp.pedido_id,
      sp.restaurante_id,
      sp.driver_id,
      sp.estado,
      sp.subtotal,
      sp.costo_envio,
      sp.distancia_km,
      sp.tiempo_estimado,
      sp.direccion_snapshot,
      sp.creado_en,
      sp.propina_vip_monto,
      r.nombre as restaurante_nombre,
      r.celular as restaurante_celular,
      d.id as driver_id,
      d.nombre as driver_nombre,
      d.celular as driver_celular
    FROM sub_pedidos sp
    INNER JOIN restaurantes r ON r.id = sp.restaurante_id
    LEFT JOIN usuarios d ON d.id = sp.driver_id
    WHERE sp.pedido_id = ${pedidoId}
    ORDER BY sp.creado_en ASC
  ` 

  // Items por sub-pedido
  const subsConItems = await Promise.all(
    subs.map(async (sp: any) => {
      const items = await sql`
        SELECT id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas
        FROM pedido_items
        WHERE sub_pedido_id = ${sp.id}
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
        SELECT h.estado, h.notas, h.creado_en, u.nombre as cambiado_por_nombre
        FROM pedido_estado_historial h
        LEFT JOIN usuarios u ON u.id = h.cambiado_por
        WHERE h.sub_pedido_id = ${sp.id}
        ORDER BY h.creado_en ASC
      `

      return { ...sp, items: itemsConOpciones, historial }
    })
  )

  return { ...pedido, sub_pedidos: subsConItems }
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400',
  ACEPTADO: 'bg-blue-500/15 text-blue-400',
  PREPARANDO: 'bg-blue-500/15 text-blue-400',
  LISTO: 'bg-cyan-500/15 text-cyan-400',
  ASIGNADO: 'bg-orange-500/15 text-orange-400',
  EN_CAMINO: 'bg-orange-500/15 text-orange-400',
  ENTREGADO: 'bg-brand/15 text-brand',
  RECHAZADO: 'bg-red-500/15 text-red-400',
  CANCELADO: 'bg-gray-500/15 text-gray-400',
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  PREPARANDO: 'Aceptado',
  LISTO: 'Listo',
  ASIGNADO: 'En camino',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pedido = await getPedido(id)

  if (!pedido) notFound()

  const esMulti = pedido.sub_pedidos.length > 1

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
            {pedido.codigo}
          </h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              ESTADO_COLORES[pedido.estado_global] ||
              ESTADO_COLORES.PENDIENTE
            }`}
          >
            {ESTADO_LABELS[pedido.estado_global] || pedido.estado_global}
          </span>
          {esMulti && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-bold">
              🏪 {pedido.sub_pedidos.length} LOCALES
            </span>
          )}
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

      <PedidoDetalleMulti pedido={pedido} />
    </div>
  )
}
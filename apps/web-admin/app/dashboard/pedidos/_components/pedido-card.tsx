'use client'

import Link from 'next/link'

export interface SubPedido {
  id: string
  restaurante_id: string
  restaurante_nombre: string
  estado: string
  subtotal: string
  costo_envio: string
  driver_nombre: string | null
  distancia_km: string | null
}

export interface Pedido {
  id: string
  pedido_codigo: string
  estado: string
  subtotal: string
  total_envio: string
  propina: string
  vip: boolean
  costo_vip: string
  total: string
  notas: string | null
  creado_en: string
  cliente_nombre: string
  cliente_celular: string
  direccion_snapshot: any
  restaurante_principal: string
  restaurantes_extra: string[]
  num_locales: number
  driver_nombre: string | null
  sub_pedidos: SubPedido[]
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

export default function PedidoCard({
  pedido,
  compact = false,
}: {
  pedido: Pedido
  compact?: boolean
}) {
  const minutosDesdeCreacion = Math.floor(
    (Date.now() - new Date(pedido.creado_en).getTime()) / 60000
  )
  const dir = pedido.direccion_snapshot || {}
  const esMulti = pedido.num_locales > 1

  // ============================================
  // MODO COMPACTO
  // ============================================
  if (compact) {
    return (
      <Link
        href={`/dashboard/pedidos/${pedido.id}`}
        className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-surface-light transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-bold text-white">
              {pedido.pedido_codigo}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                ESTADO_COLORES[pedido.estado] || ESTADO_COLORES.PENDIENTE
              }`}
            >
              {ESTADO_LABELS[pedido.estado] || pedido.estado}
            </span>
            {esMulti && (
              <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                {pedido.num_locales} LOCALES
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {pedido.cliente_nombre} · {pedido.restaurante_principal}
            {esMulti && ` +${pedido.num_locales - 1}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-brand">
            S/ {Number(pedido.total).toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-500">
            {new Date(pedido.creado_en).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </Link>
    )
  }

  // ============================================
  // MODO CARD
  // ============================================
  return (
    <Link
      href={`/dashboard/pedidos/${pedido.id}`}
      className={`block bg-surface border rounded-xl p-3 hover:border-brand/40 transition-colors ${
        esMulti ? 'border-purple-500/40' : 'border-line'
      }`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">
            {pedido.pedido_codigo}
          </p>
          <p className="text-[10px] text-gray-500">
            hace {minutosDesdeCreacion} min
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {pedido.vip && (
            <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">
              ⭐ VIP
            </span>
          )}
          <span className="text-xs font-bold text-brand">
            S/ {Number(pedido.total).toFixed(2)}
          </span>
        </div>
      </div>

      {/* BADGE MULTI-LOCAL */}
      {esMulti && (
        <div className="mb-2 inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
          🏪 {pedido.num_locales} LOCALES
        </div>
      )}

      {/* CLIENTE */}
      <div className="mb-2">
        <p className="text-xs text-white truncate">
          👤 {pedido.cliente_nombre}
        </p>
        <p className="text-[10px] text-gray-500 truncate">
          📍 {dir.direccion || 'Sin dirección'}
        </p>
      </div>

      {/* RESTAURANTES */}
      <div className="mb-2 pb-2 border-b border-line">
        <p className="text-[10px] text-gray-500 truncate">
          🏪 {pedido.restaurante_principal}
          {esMulti && (
            <span className="text-purple-400 font-medium">
              {' '}
              +{pedido.num_locales - 1} más
            </span>
          )}
        </p>
      </div>

      {/* DRIVER */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {pedido.driver_nombre ? (
          <span className="text-[10px] text-gray-400">
            🏍️ {pedido.driver_nombre}
          </span>
        ) : (
          <span className="text-[10px] text-gray-600 italic">
            Sin driver
          </span>
        )}
      </div>
    </Link>
  )
}
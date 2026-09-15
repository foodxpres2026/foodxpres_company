'use client'

import Link from 'next/link'

export interface Pedido {
  id: string
  estado: string
  subtotal: string
  costo_envio: string
  distancia_km: string | null
  tiempo_estimado: number | null
  notas: string | null
  creado_en: string
  aceptado_en: string | null
  entregado_en: string | null
  direccion_snapshot: any
  pedido_id: string
  pedido_codigo: string
  propina: string
  vip: boolean
  costo_vip: string
  total: string
  cliente_nombre: string
  cliente_celular: string
  restaurante_id: string
  restaurante_nombre: string
  driver_id: string | null
  driver_nombre: string | null
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  ACEPTADO: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PREPARANDO: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  LISTO: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  ASIGNADO: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  EN_CAMINO: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ENTREGADO: 'bg-brand/15 text-brand border-brand/30',
  RECHAZADO: 'bg-red-500/15 text-red-400 border-red-500/30',
  CANCELADO: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

export default function PedidoCard({ pedido }: { pedido: Pedido }) {
  const minutosDesdeCreacion = Math.floor(
    (Date.now() - new Date(pedido.creado_en).getTime()) / 60000
  )

  const dir = pedido.direccion_snapshot || {}

  return (
    <Link
      href={`/dashboard/pedidos/${pedido.id}`}
      className="block bg-surface border border-line rounded-xl p-3 hover:border-brand/40 transition-colors"
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
              VIP
            </span>
          )}
          <span className="text-xs font-bold text-brand">
            S/ {Number(pedido.total).toFixed(2)}
          </span>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="mb-2">
        <p className="text-xs text-white truncate">
          👤 {pedido.cliente_nombre}
        </p>
        <p className="text-[10px] text-gray-500 truncate">
          📍 {dir.direccion || 'Sin dirección'}
        </p>
      </div>

      {/* RESTAURANTE */}
      <div className="mb-2 pb-2 border-b border-line">
        <p className="text-[10px] text-gray-500 truncate">
          🏪 {pedido.restaurante_nombre}
        </p>
      </div>

      {/* ESTADO + DRIVER */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
            ESTADO_COLORES[pedido.estado] || ESTADO_COLORES.PENDIENTE
          }`}
        >
          {pedido.estado.replace('_', ' ')}
        </span>
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
'use client'

import Link from 'next/link'

export interface SubPedido {
  id: string
  restaurante_id: string
  restaurante_nombre: string
  estado: string
  subtotal: string
  costo_envio: string
  driver_id: string | null
  driver_nombre: string | null
  distancia_km: string | null
  entrega_reportada_en?: string | null
  cliente_confirmo_en?: string | null
  entrega_cerrada_admin_en?: string | null
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
  EN_CLIENTE: 'bg-emerald-500/15 text-emerald-300',
  ENTREGA_PENDIENTE_CONFIRMACION: 'bg-yellow-500/15 text-yellow-300',
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
  EN_CLIENTE: 'Driver llegó al cliente',
  ENTREGA_PENDIENTE_CONFIRMACION: 'Esperando confirmación',
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
  const pendientesConfirmacion = pedido.sub_pedidos.filter((sub) => sub.estado === 'ENTREGA_PENDIENTE_CONFIRMACION').length
  const llegadasCliente = pedido.sub_pedidos.filter((sub) => sub.estado === 'EN_CLIENTE').length
  const liberadosAdmin = pedido.sub_pedidos.filter((sub) => sub.estado === 'ENTREGADO' && sub.entrega_cerrada_admin_en).length
  const confirmadosCliente = pedido.sub_pedidos.filter((sub) => sub.estado === 'ENTREGADO' && sub.cliente_confirmo_en).length

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
            {pendientesConfirmacion > 0 && <span className="text-[9px] bg-yellow-500/15 text-yellow-300 px-1.5 py-0.5 rounded font-bold">📦 {pendientesConfirmacion > 1 ? `${pendientesConfirmacion} por confirmar` : 'Por confirmar · driver en espera'}</span>}
            {llegadasCliente > 0 && <span className="text-[9px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded font-bold">📍 {llegadasCliente > 1 ? `${llegadasCliente} drivers llegaron` : 'Driver llegó · cliente debe confirmar'}</span>}
            {liberadosAdmin > 0 && <span className="text-[9px] bg-orange-500/15 text-orange-300 px-1.5 py-0.5 rounded font-bold">Liberado por admin{liberadosAdmin > 1 ? ` · ${liberadosAdmin}` : ''}</span>}
            {confirmadosCliente > 0 && <span className="text-[9px] bg-brand/15 text-brand px-1.5 py-0.5 rounded font-bold">Confirmado por cliente{confirmadosCliente > 1 ? ` · ${confirmadosCliente}` : ''}</span>}
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
      {pendientesConfirmacion > 0 && <div className="mb-2 inline-flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 text-[10px] font-bold px-2 py-1 rounded-full">📦 {pendientesConfirmacion > 1 ? `${pendientesConfirmacion} pedidos esperan confirmación` : 'Esperando confirmación · driver en espera'}</div>}
      {liberadosAdmin > 0 && <div className="mb-2 inline-flex items-center gap-1 bg-orange-500/15 border border-orange-500/25 text-orange-300 text-[10px] font-bold px-2 py-1 rounded-full">Liberado por admin{liberadosAdmin > 1 ? ` · ${liberadosAdmin}` : ''}</div>}
      {confirmadosCliente > 0 && <div className="mb-2 inline-flex items-center gap-1 bg-brand/15 border border-brand/25 text-brand text-[10px] font-bold px-2 py-1 rounded-full">Confirmado por cliente{confirmadosCliente > 1 ? ` · ${confirmadosCliente}` : ''}</div>}

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

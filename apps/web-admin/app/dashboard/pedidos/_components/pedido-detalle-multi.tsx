'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DriverSelector from './driver-selector'

interface Item {
  id: string
  nombre_snapshot: string
  precio_snapshot: string
  cantidad: number
  subtotal: string
  notas: string | null
  opciones: {
    grupo_titulo_snapshot: string
    choice_nombre_snapshot: string
    precio_extra: string
  }[]
}

interface Historial {
  estado: string
  notas: string | null
  creado_en: string
  cambiado_por_nombre: string | null
}

interface SubPedido {
  id: string
  estado: string
  subtotal: string
  costo_envio: string
  distancia_km: string | null
  tiempo_estimado: number | null
  notas: string | null
  direccion_snapshot: any
  motivo_rechazo: string | null
  restaurante_nombre: string
  restaurante_celular: string | null
  driver_id: string | null
  driver_nombre: string | null
  driver_celular: string | null
  items: Item[]
  historial: Historial[]
}

interface PedidoDetalle {
  id: string
  codigo: string
  subtotal: string
  total_envio: string
  propina: string
  vip: boolean
  costo_vip: string
  total: string
  notas: string | null
  estado_global: string
  creado_en: string
  cliente_nombre: string
  cliente_celular: string
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
  PARCIAL: 'bg-purple-500/15 text-purple-400',
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
  PARCIAL: 'Parcial',
}

const ESTADOS_SIGUIENTES: Record<string, string[]> = {
  PENDIENTE: ['ACEPTADO', 'RECHAZADO', 'CANCELADO'],
  ACEPTADO: ['LISTO', 'CANCELADO'],
  PREPARANDO: ['LISTO', 'CANCELADO'],
  LISTO: ['EN_CAMINO', 'CANCELADO'],
  ASIGNADO: ['EN_CAMINO', 'CANCELADO'],
  EN_CAMINO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  RECHAZADO: [],
  CANCELADO: [],
}

export default function PedidoDetalleMulti({
  pedido,
}: {
  pedido: PedidoDetalle
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localActivo, setLocalActivo] = useState(0)

  const esMulti = pedido.sub_pedidos.length > 1
  const primeraDireccion = pedido.sub_pedidos[0]?.direccion_snapshot || {}

  const totalAceptados = pedido.sub_pedidos.filter((sp) =>
    ['ACEPTADO', 'PREPARANDO', 'LISTO', 'EN_CAMINO', 'ENTREGADO'].includes(
      sp.estado
    )
  ).length

  const totalRechazados = pedido.sub_pedidos.filter((sp) =>
    ['RECHAZADO', 'CANCELADO'].includes(sp.estado)
  ).length

  async function cambiarEstado(subPedidoId: string, nuevoEstado: string) {
    let notas: string | null = null
    if (nuevoEstado === 'CANCELADO' || nuevoEstado === 'RECHAZADO') {
      notas = prompt(`Motivo de ${nuevoEstado.toLowerCase()}:`)
      if (notas === null) return
    }

    setError(null)
    setLoading(subPedidoId)
    try {
      const res = await fetch(`/api/pedidos/${subPedidoId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, notas }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al cambiar estado')
        return
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const spActual = pedido.sub_pedidos[localActivo]

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ============================================================
          CARD ÚNICA CON RESUMEN + CLIENTE + COSTES
         ============================================================ */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {/* HEADER: Total grande */}
        <div className="bg-gradient-to-br from-brand/10 to-transparent px-5 md:px-6 py-5 border-b border-line">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Total del pedido
              </p>
              <p className="text-3xl md:text-4xl font-bold text-brand mt-1">
                S/ {Number(pedido.total).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {pedido.sub_pedidos.length} local
                {pedido.sub_pedidos.length === 1 ? '' : 'es'}
              </p>
              {pedido.vip && (
                <span className="inline-block mt-1 text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                  ⭐ VIP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CLIENTE */}
        <div className="px-5 md:px-6 py-4 border-b border-line">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold flex-shrink-0">
              {pedido.cliente_nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {pedido.cliente_nombre}
              </p>
              <p className="text-xs text-gray-500">
                📱 {pedido.cliente_celular}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                📍 {primeraDireccion.direccion || 'Sin dirección'}
                {primeraDireccion.referencia && (
                  <span className="text-gray-600">
                    {' '}
                    · {primeraDireccion.referencia}
                  </span>
                )}
              </p>
            </div>
          </div>
          {pedido.notas && (
            <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
              <p className="text-[10px] text-yellow-500 uppercase mb-0.5">
                📝 Nota del cliente
              </p>
              <p className="text-xs text-gray-300">{pedido.notas}</p>
            </div>
          )}
        </div>

        {/* DESGLOSE DE COSTES COMPLETO */}
        <div className="px-5 md:px-6 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Desglose
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal (productos)</span>
              <span className="text-white">
                S/ {Number(pedido.subtotal).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">
                Delivery ({pedido.sub_pedidos.length} envío
                {pedido.sub_pedidos.length === 1 ? '' : 's'})
              </span>
              <span className="text-white">
                S/ {Number(pedido.total_envio).toFixed(2)}
              </span>
            </div>
            {Number(pedido.propina) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Propina</span>
                <span className="text-white">
                  S/ {Number(pedido.propina).toFixed(2)}
                </span>
              </div>
            )}
            {pedido.vip && (
              <div className="flex justify-between">
                <span className="text-gray-400">Servicio VIP</span>
                <span className="text-yellow-400">
                  S/ {Number(pedido.costo_vip).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-line">
              <span className="font-bold text-white">Total</span>
              <span className="font-bold text-brand text-lg">
                S/ {Number(pedido.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* RESUMEN POR LOCAL (si es multi) */}
        {esMulti && (
          <div className="px-5 md:px-6 py-4 bg-surface-dark border-t border-line">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Estado por local
              </span>
              <span className="text-[10px] bg-brand/15 text-brand px-2 py-0.5 rounded-full font-bold">
                {totalAceptados} aceptados
              </span>
              {totalRechazados > 0 && (
                <span className="text-[10px] bg-danger/15 text-danger px-2 py-0.5 rounded-full font-bold">
                  {totalRechazados} rechazados
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {pedido.sub_pedidos.map((sp) => (
                <div
                  key={sp.id}
                  className="flex items-center justify-between gap-2 text-xs py-1.5 px-3 bg-surface rounded-lg"
                >
                  <span className="text-gray-400 truncate">
                    {sp.restaurante_nombre}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                      ESTADO_COLORES[sp.estado] || ESTADO_COLORES.PENDIENTE
                    }`}
                  >
                    {ESTADO_LABELS[sp.estado] || sp.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          DESLIZADOR DE LOCALES (si es multi)
         ============================================================ */}
      {esMulti && (
        <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
          <div className="flex gap-2 min-w-max pb-1">
            {pedido.sub_pedidos.map((sp, i) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setLocalActivo(i)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap border ${
                  localActivo === i
                    ? 'bg-brand text-black border-brand'
                    : 'bg-surface text-gray-400 border-line hover:border-brand/40'
                }`}
              >
                <span className="font-bold">{i + 1}.</span>
                <span className="truncate max-w-[140px]">
                  {sp.restaurante_nombre}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    localActivo === i
                      ? 'bg-black/20 text-black'
                      : ESTADO_COLORES[sp.estado] || ESTADO_COLORES.PENDIENTE
                  }`}
                >
                  {ESTADO_LABELS[sp.estado] || sp.estado}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          LOCAL ACTIVO (con sus detalles)
         ============================================================ */}
      {spActual && (
        <div className="space-y-4">
          {/* Header del local */}
          <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">
                  🏪 {spActual.restaurante_nombre}
                </h3>
                {spActual.restaurante_celular && (
                  <p className="text-xs text-gray-500">
                    📱 {spActual.restaurante_celular}
                  </p>
                )}
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${
                  ESTADO_COLORES[spActual.estado] ||
                  ESTADO_COLORES.PENDIENTE
                }`}
              >
                {ESTADO_LABELS[spActual.estado] || spActual.estado}
              </span>
            </div>

            {/* Costes específicos de este local */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Subtotal</p>
                <p className="text-sm text-white font-medium">
                  S/ {Number(spActual.subtotal).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">
                  Delivery
                </p>
                <p className="text-sm text-white font-medium">
                  S/ {Number(spActual.costo_envio).toFixed(2)}
                  {spActual.distancia_km && (
                    <span className="text-gray-500 text-xs ml-1">
                      ({Number(spActual.distancia_km).toFixed(1)} km)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {spActual.motivo_rechazo && (
              <div className="mt-3 p-3 bg-danger/10 border border-danger/30 rounded-lg">
                <p className="text-xs text-danger">
                  <strong>Motivo de rechazo:</strong>{' '}
                  {spActual.motivo_rechazo}
                </p>
              </div>
            )}
          </div>

          {/* Driver */}
          <DriverSelector
            pedidoId={spActual.id}
            driverActual={
              spActual.driver_id
                ? {
                    id: spActual.driver_id,
                    nombre: spActual.driver_nombre || '',
                  }
                : null
            }
          />

          {/* Items */}
          <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
            <h3 className="text-base font-bold text-white mb-4">
              🍔 Items ({spActual.items.length})
            </h3>
            <div className="space-y-3">
              {spActual.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand/15 text-brand flex items-center justify-center text-xs font-bold">
                    {item.cantidad}×
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm text-white font-medium truncate">
                        {item.nombre_snapshot}
                      </p>
                      <p className="text-sm text-white font-bold flex-shrink-0">
                        S/ {Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>

                    {item.opciones.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.opciones.map((op, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-surface-dark border border-line text-gray-400 px-1.5 py-0.5 rounded"
                          >
                            {op.choice_nombre_snapshot}
                            {Number(op.precio_extra) > 0 && (
                              <span className="text-brand ml-1">
                                +S/{Number(op.precio_extra).toFixed(2)}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.notas && (
                      <p className="mt-1 text-[11px] text-yellow-500">
                        📝 {item.notas}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cambiar estado */}
          {ESTADOS_SIGUIENTES[spActual.estado]?.length > 0 && (
            <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
              <h3 className="text-base font-bold text-white mb-3">
                Cambiar estado de este local
              </h3>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_SIGUIENTES[spActual.estado].map((est) => {
                  const esCancelacion =
                    est === 'CANCELADO' || est === 'RECHAZADO'
                  return (
                    <button
                      key={est}
                      type="button"
                      onClick={() => cambiarEstado(spActual.id, est)}
                      disabled={loading === spActual.id}
                      className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] ${
                        esCancelacion
                          ? 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30'
                          : 'bg-brand hover:bg-brand-dark text-black disabled:bg-brand/40'
                      }`}
                    >
                      {loading === spActual.id
                        ? '...'
                        : ESTADO_LABELS[est] || est}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Historial */}
          {spActual.historial.length > 0 && (
            <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
              <h3 className="text-base font-bold text-white mb-3">
                Historial ({spActual.historial.length})
              </h3>
              <div className="space-y-3">
                {spActual.historial.map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          i === spActual.historial.length - 1
                            ? 'bg-brand'
                            : 'bg-gray-700'
                        }`}
                      />
                      {i < spActual.historial.length - 1 && (
                        <div className="w-px flex-1 bg-line my-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-bold text-brand">
                          {ESTADO_LABELS[h.estado] || h.estado}
                        </span>
                        {h.cambiado_por_nombre && (
                          <span className="text-[10px] text-gray-500">
                            por {h.cambiado_por_nombre}
                          </span>
                        )}
                      </div>
                      {h.notas && (
                        <p className="text-xs text-gray-400">{h.notas}</p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1">
                        {new Date(h.creado_en).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
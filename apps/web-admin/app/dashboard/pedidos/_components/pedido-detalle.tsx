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

export interface PedidoDetalle {
  id: string
  pedido_id: string
  pedido_codigo: string
  estado: string
  subtotal: string
  costo_envio: string
  distancia_km: string | null
  tiempo_estimado: number | null
  notas: string | null
  pedido_notas: string | null
  creado_en: string
  aceptado_en: string | null
  listo_en: string | null
  recogido_en: string | null
  entregado_en: string | null
  direccion_snapshot: any
  motivo_rechazo: string | null
  propina: string
  vip: boolean
  costo_vip: string
  pedido_total: string
  cliente_nombre: string
  cliente_celular: string
  restaurante_nombre: string
  restaurante_celular: string | null
  driver_id: string | null
  driver_nombre: string | null
  driver_celular: string | null
  items: Item[]
  historial: Historial[]
}

const ESTADOS_SIGUIENTES: Record<string, string[]> = {
  PENDIENTE: ['ACEPTADO', 'RECHAZADO', 'CANCELADO'],
  ACEPTADO: ['LISTO', 'CANCELADO'],
  PREPARANDO: ['LISTO', 'CANCELADO'], // legacy
  LISTO: ['EN_CAMINO', 'CANCELADO'],
  ASIGNADO: ['EN_CAMINO', 'CANCELADO'], // legacy
  EN_CAMINO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  RECHAZADO: [],
  CANCELADO: [],
}
const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  PREPARANDO: 'Aceptado', // legacy → se muestra como Aceptado
  LISTO: 'Listo',
  ASIGNADO: 'En camino', // legacy
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
}

export default function PedidoDetalle({
  pedido,
}: {
  pedido: PedidoDetalle
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dir = pedido.direccion_snapshot || {}
  const siguientes = ESTADOS_SIGUIENTES[pedido.estado] ?? []

  async function cambiarEstado(nuevoEstado: string) {
    let notas: string | null = null
    if (nuevoEstado === 'CANCELADO' || nuevoEstado === 'RECHAZADO') {
      notas = prompt(`Motivo de ${nuevoEstado.toLowerCase()}:`)
      if (notas === null) return // canceló el prompt
    }

    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/estado`, {
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
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* RESUMEN */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
        <h3 className="text-base font-bold text-white mb-3">Resumen</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase">Subtotal</p>
            <p className="text-white">S/ {Number(pedido.subtotal).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Envío</p>
            <p className="text-white">
              S/ {Number(pedido.costo_envio).toFixed(2)}
              {pedido.distancia_km && (
                <span className="text-gray-500 text-xs ml-1">
                  ({pedido.distancia_km} km)
                </span>
              )}
            </p>
          </div>
          {Number(pedido.propina) > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Propina</p>
              <p className="text-white">
                S/ {Number(pedido.propina).toFixed(2)}
              </p>
            </div>
          )}
          {pedido.vip && (
            <div>
              <p className="text-xs text-gray-500 uppercase">VIP</p>
              <p className="text-yellow-400">
                +S/ {Number(pedido.costo_vip).toFixed(2)}
              </p>
            </div>
          )}
          <div className="col-span-2 pt-2 border-t border-line">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-brand font-bold text-lg">
              S/ {Number(pedido.pedido_total).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
        <h3 className="text-base font-bold text-white mb-3">👤 Cliente</h3>
        <p className="text-white">{pedido.cliente_nombre}</p>
        <p className="text-sm text-gray-400">📱 {pedido.cliente_celular}</p>
        <div className="mt-3 p-3 bg-surface-dark rounded-xl">
          <p className="text-xs text-gray-500 uppercase mb-1">Dirección</p>
          <p className="text-sm text-white">
            {dir.direccion || 'Sin dirección'}
          </p>
          {dir.referencia && (
            <p className="text-xs text-gray-500 mt-1">
              Ref: {dir.referencia}
            </p>
          )}
        </div>
        {pedido.notas && (
          <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-500 uppercase mb-1">
              📝 Nota del cliente
            </p>
            <p className="text-sm text-gray-300">{pedido.notas}</p>
          </div>
        )}
        {pedido.pedido_notas && (
          <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-400 uppercase mb-1">
              📋 Nota general
            </p>
            <p className="text-sm text-gray-300">{pedido.pedido_notas}</p>
          </div>
        )}
      </div>

      {/* RESTAURANTE */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
        <h3 className="text-base font-bold text-white mb-2">
          🏪 {pedido.restaurante_nombre}
        </h3>
        {pedido.restaurante_celular && (
          <p className="text-sm text-gray-400">
            📱 {pedido.restaurante_celular}
          </p>
        )}
      </div>

      {/* DRIVER */}
      <DriverSelector
        pedidoId={pedido.id}
        driverActual={
          pedido.driver_id
            ? { id: pedido.driver_id, nombre: pedido.driver_nombre || '' }
            : null
        }
      />

      {/* ITEMS */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
        <h3 className="text-base font-bold text-white mb-3">
          🍔 Items ({pedido.items.length})
        </h3>
        <div className="space-y-3">
          {pedido.items.map((item) => (
            <div
              key={item.id}
              className="pb-3 border-b border-line last:border-0 last:pb-0"
            >
              <div className="flex justify-between gap-3">
                <p className="text-sm text-white flex-1">
                  <span className="text-brand font-bold">
                    {item.cantidad}×
                  </span>{' '}
                  {item.nombre_snapshot}
                </p>
                <p className="text-sm text-white font-bold">
                  S/ {Number(item.subtotal).toFixed(2)}
                </p>
              </div>
              {item.opciones.length > 0 && (
                <div className="mt-1.5 ml-6 space-y-0.5">
                  {item.opciones.map((op, i) => (
                    <p key={i} className="text-xs text-gray-500">
                      ↳ {op.grupo_titulo_snapshot}:{' '}
                      <span className="text-gray-400">
                        {op.choice_nombre_snapshot}
                      </span>
                      {Number(op.precio_extra) > 0 && (
                        <span className="text-brand ml-1">
                          +S/ {Number(op.precio_extra).toFixed(2)}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}
              {item.notas && (
                <p className="mt-1.5 ml-6 text-xs text-yellow-500">
                  📝 {item.notas}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ACCIONES DE ESTADO */}
      {siguientes.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
          <h3 className="text-base font-bold text-white mb-3">
            Cambiar estado
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Estado actual: <strong className="text-white">{ESTADO_LABELS[pedido.estado]}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {siguientes.map((est) => {
              const esCancelacion = est === 'CANCELADO' || est === 'RECHAZADO'
              return (
                <button
                  key={est}
                  type="button"
                  onClick={() => cambiarEstado(est)}
                  disabled={loading}
                  className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] ${
                    esCancelacion
                      ? 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30'
                      : 'bg-brand hover:bg-brand-dark text-black disabled:bg-brand/40'
                  }`}
                >
                  {ESTADO_LABELS[est]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {pedido.historial.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
          <h3 className="text-base font-bold text-white mb-3">
            Historial ({pedido.historial.length})
          </h3>
          <div className="space-y-2">
            {pedido.historial.map((h, i) => (
              <div
                key={i}
                className="flex gap-3 text-xs"
              >
                <span className="text-gray-600 w-12 flex-shrink-0">
                  {new Date(h.creado_en).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex-1">
                  <span className="text-brand font-bold">
                    {ESTADO_LABELS[h.estado] || h.estado}
                  </span>
                  {h.cambiado_por_nombre && (
                    <span className="text-gray-500">
                      {' '}· {h.cambiado_por_nombre}
                    </span>
                  )}
                  {h.notas && (
                    <p className="text-gray-500 mt-0.5">{h.notas}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
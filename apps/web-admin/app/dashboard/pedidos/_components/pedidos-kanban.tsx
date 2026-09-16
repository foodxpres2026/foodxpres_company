'use client'

import { useEffect, useMemo, useState } from 'react'
import PedidoCard, { type Pedido } from './pedido-card'

const COLUMNAS_ACTIVAS = [
  { estado: 'PENDIENTE', label: 'Pendientes', icon: '⏳' },
  { estado: 'ACEPTADO', label: 'Aceptados', icon: '✅' },
  { estado: 'LISTO', label: 'Listos', icon: '🍽️' },
  { estado: 'EN_CAMINO', label: 'En camino', icon: '🛵' },
] as const

interface Restaurante {
  id: string
  nombre: string
}

export default function PedidosKanban({
  restaurantes,
}: {
  restaurantes: Restaurante[]
}) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [restauranteFiltro, setRestauranteFiltro] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [finalizadosAbierto, setFinalizadosAbierto] = useState(false)

  async function cargar() {
    try {
      const url = restauranteFiltro
        ? `/api/pedidos?restaurante_id=${restauranteFiltro}`
        : '/api/pedidos'
      const res = await fetch(url)
      const data = await res.json()
      if (data.ok) setPedidos(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restauranteFiltro])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(cargar, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, restauranteFiltro])

  const porEstado = useMemo(() => {
    const map: Record<string, Pedido[]> = {}
    for (const col of COLUMNAS_ACTIVAS) map[col.estado] = []
    for (const p of pedidos) {
      const estadoNormalizado =
        p.estado === 'ASIGNADO'
          ? 'EN_CAMINO'
          : p.estado === 'PREPARANDO'
          ? 'ACEPTADO'
          : p.estado
      if (map[estadoNormalizado]) map[estadoNormalizado].push(p)
    }
    return map
  }, [pedidos])

  const finalizados = useMemo(() => {
    return pedidos
      .filter((p) =>
        ['ENTREGADO', 'RECHAZADO', 'CANCELADO'].includes(p.estado)
      )
      .sort(
        (a, b) =>
          new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      )
      .slice(0, 10)
  }, [pedidos])

  const totalActivos = Object.values(porEstado).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  return (
    <div className="space-y-4">
      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={restauranteFiltro}
            onChange={(e) => setRestauranteFiltro(e.target.value)}
            className="px-3 py-2 bg-surface border border-line rounded-lg text-white text-sm focus:outline-none focus:border-brand"
          >
            <option value="">Todos los restaurantes</option>
            {restaurantes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>

          <span className="text-xs text-gray-500">
            {totalActivos} activo{totalActivos === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-brand"
            />
            Auto (15s)
          </label>
          <button
            type="button"
            onClick={cargar}
            className="text-xs bg-surface border border-line hover:border-brand px-3 py-1.5 rounded-lg text-gray-300 transition-colors"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Cargando pedidos...
        </div>
      ) : (
        <>
          {totalActivos === 0 ? (
            <div className="bg-surface border border-line rounded-2xl p-12 text-center">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-gray-400">No hay pedidos activos</p>
              <p className="text-xs text-gray-600 mt-1">
                Los pedidos aparecerán aquí cuando los clientes ordenen
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0 pb-2">
              <div className="flex gap-3 min-w-max">
                {COLUMNAS_ACTIVAS.map((col) => {
                  const items = porEstado[col.estado] || []
                  return (
                    <div
                      key={col.estado}
                      className="w-64 flex-shrink-0 bg-surface/50 border border-line rounded-2xl p-3"
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{col.icon}</span>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                            {col.label}
                          </h3>
                        </div>
                        <span className="text-xs bg-surface-light text-gray-400 px-2 py-0.5 rounded-full font-bold">
                          {items.length}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                        {items.length === 0 ? (
                          <p className="text-[10px] text-gray-600 text-center py-4 italic">
                            Sin pedidos
                          </p>
                        ) : (
                          items.map((p) => (
                            <PedidoCard key={p.id} pedido={p} />
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {finalizados.length > 0 && (
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setFinalizadosAbierto(!finalizadosAbierto)}
                className="w-full flex items-center justify-between px-4 md:px-5 py-3 hover:bg-surface-light transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">📁</span>
                  <span className="text-sm font-bold text-white">
                    Pedidos finalizados
                  </span>
                  <span className="text-xs bg-surface-light text-gray-500 px-2 py-0.5 rounded-full font-bold">
                    Últimos {finalizados.length}
                  </span>
                </div>
                <span
                  className={`text-gray-500 transition-transform ${
                    finalizadosAbierto ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              {finalizadosAbierto && (
                <div className="border-t border-line divide-y divide-line">
                  {finalizados.map((p) => (
                    <PedidoCard key={p.id} pedido={p} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
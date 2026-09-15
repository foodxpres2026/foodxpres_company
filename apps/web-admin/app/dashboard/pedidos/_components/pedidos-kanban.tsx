'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PedidoCard, { type Pedido } from './pedido-card'

const COLUMNAS = [
  { estado: 'PENDIENTE', label: 'Pendientes', icon: '⏳' },
  { estado: 'ACEPTADO', label: 'Aceptados', icon: '✅' },
  { estado: 'PREPARANDO', label: 'Preparando', icon: '👨‍🍳' },
  { estado: 'LISTO', label: 'Listos', icon: '🍽️' },
  { estado: 'ASIGNADO', label: 'Asignados', icon: '📌' },
  { estado: 'EN_CAMINO', label: 'En camino', icon: '🛵' },
  { estado: 'ENTREGADO', label: 'Entregados', icon: '🎉' },
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
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [restauranteFiltro, setRestauranteFiltro] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [ultimaAct, setUltimaAct] = useState<Date>(new Date())

  async function cargar() {
    try {
      const url = restauranteFiltro
        ? `/api/pedidos?restaurante_id=${restauranteFiltro}`
        : '/api/pedidos'
      const res = await fetch(url)
      const data = await res.json()
      if (data.ok) {
        setPedidos(data.data)
        setUltimaAct(new Date())
      }
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

  // Agrupar por estado (sin los rechazados/cancelados)
  const porEstado = useMemo(() => {
    const map: Record<string, Pedido[]> = {}
    for (const col of COLUMNAS) map[col.estado] = []
    for (const p of pedidos) {
      if (map[p.estado]) map[p.estado].push(p)
    }
    return map
  }, [pedidos])

  const totalActivos = pedidos.filter(
    (p) => !['ENTREGADO', 'RECHAZADO', 'CANCELADO'].includes(p.estado)
  ).length

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
            {totalActivos} pedido{totalActivos === 1 ? '' : 's'} activo
            {totalActivos === 1 ? '' : 's'}
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
      ) : pedidos.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-gray-400">No hay pedidos aún</p>
          <p className="text-xs text-gray-600 mt-1">
            Los pedidos aparecerán aquí cuando los clientes ordenen
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
          <div className="flex gap-3 min-w-max">
            {COLUMNAS.map((col) => {
              const items = porEstado[col.estado] || []
              return (
                <div
                  key={col.estado}
                  className="w-64 flex-shrink-0 bg-surface/50 border border-line rounded-2xl p-3"
                >
                  {/* HEADER COLUMNA */}
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

                  {/* CARDS */}
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-[10px] text-gray-600 text-center py-4 italic">
                        Sin pedidos
                      </p>
                    ) : (
                      items.map((p) => <PedidoCard key={p.id} pedido={p} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PedidoCard, { type Pedido } from './pedido-card'

const COLUMNAS_ACTIVAS = [
  { estado: 'PENDIENTE', label: 'Pendientes', icon: '⏳' },
  { estado: 'ACEPTADO', label: 'Aceptados', icon: '✅' },
  { estado: 'LISTO', label: 'Listos', icon: '🍽️' },
  { estado: 'EN_CAMINO', label: 'En camino', icon: '🛵' },
  { estado: 'EN_CLIENTE', label: 'Llegó al cliente', icon: '📍' },
  { estado: 'ENTREGA_PENDIENTE_CONFIRMACION', label: 'Esperando confirmación', icon: '📦' },
] as const

interface Restaurante {
  id: string
  nombre: string
}
interface Driver { id: string; nombre: string }

export default function PedidosKanban({
  restaurantes,
  drivers,
}: {
  restaurantes: Restaurante[]
  drivers: Driver[]
}) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [restauranteFiltro, setRestauranteFiltro] = useState<string>('')
  const [driverFiltro, setDriverFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('TODOS')
  const [codigo, setCodigo] = useState('')
  const [codigoBuscado, setCodigoBuscado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [finalizadosAbierto, setFinalizadosAbierto] = useState(false)

  const filtros = useMemo(() => {
    const params = new URLSearchParams()
    if (restauranteFiltro) params.set('restaurante_id', restauranteFiltro)
    if (driverFiltro) params.set('driver_id', driverFiltro)
    if (estadoFiltro !== 'TODOS') params.set('estado', estadoFiltro)
    if (codigoBuscado.trim()) params.set('codigo', codigoBuscado.trim())
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    return params.toString()
  }, [restauranteFiltro, driverFiltro, estadoFiltro, codigoBuscado, desde, hasta])

  const cargar = useCallback(async () => {
    try {
      const url = filtros ? `/api/pedidos?${filtros}` : '/api/pedidos'
      const res = await fetch(url)
      const data = await res.json()
      if (data.ok) setPedidos(data.data)
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    const timer = window.setTimeout(() => { void cargar() }, 250)
    return () => window.clearTimeout(timer)
  }, [cargar])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => { void cargar() }, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, cargar])

  const porEstado = useMemo(() => {
    const map: Record<string, Pedido[]> = {}
    for (const col of COLUMNAS_ACTIVAS) map[col.estado] = []
    for (const p of pedidos) {
      if (['ENTREGADO', 'RECHAZADO', 'CANCELADO'].includes(estadoFiltro)) continue
      const estadoNormalizado =
        p.estado === 'ASIGNADO'
          ? 'EN_CAMINO'
          : p.estado === 'PREPARANDO'
          ? 'ACEPTADO'
          : p.estado
      if (map[estadoNormalizado]) map[estadoNormalizado].push(p)
    }
    return map
  }, [pedidos, estadoFiltro])

  const finalizados = useMemo(() => {
    return pedidos
      .filter((p) => {
        const cerrados = ['ENTREGADO', 'RECHAZADO', 'CANCELADO']
        if (['ENTREGADO', 'RECHAZADO', 'CANCELADO'].includes(estadoFiltro)) {
          return p.estado === estadoFiltro || p.sub_pedidos.some((subPedido) => subPedido.estado === estadoFiltro)
        }
        return cerrados.includes(p.estado)
      })
      .sort(
        (a, b) =>
          new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      )
      .slice(0, filtros ? 200 : 10)
  }, [pedidos, filtros, estadoFiltro])

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

          <input aria-label="Buscar pedidos" value={codigo} maxLength={80} onChange={(event) => setCodigo(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setCodigoBuscado(codigo) }} placeholder="Buscar código, cliente o celular" className="min-w-[220px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-brand focus:outline-none" />
          <button type="button" onClick={() => setCodigoBuscado(codigo)} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-black hover:bg-brand-dark">Buscar</button>
          <select aria-label="Filtrar por driver" value={driverFiltro} onChange={(event) => setDriverFiltro(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white focus:border-brand focus:outline-none">
            <option value="">Todos los drivers</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nombre}</option>)}
          </select>
          <select aria-label="Filtrar por estado" value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white focus:border-brand focus:outline-none">
            <option value="TODOS">Todos los estados</option><option value="ACTIVOS">Activos</option><option value="PENDIENTE">Pendiente</option><option value="ACEPTADO">Aceptado</option><option value="LISTO">Listo</option><option value="EN_CAMINO">En camino</option><option value="EN_CLIENTE">Driver llegó al cliente</option><option value="ENTREGA_PENDIENTE_CONFIRMACION">Esperando confirmación</option><option value="ENTREGADO">Entregado</option><option value="RECHAZADO">Rechazado</option><option value="CANCELADO">Cancelado</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-500">Desde<input aria-label="Fecha desde" type="date" value={desde} max={hasta || undefined} onChange={(event) => setDesde(event.target.value)} className="rounded-lg border border-line bg-surface px-2 py-2 text-xs text-white" /></label>
          <label className="flex items-center gap-2 text-xs text-gray-500">Hasta<input aria-label="Fecha hasta" type="date" value={hasta} min={desde || undefined} onChange={(event) => setHasta(event.target.value)} className="rounded-lg border border-line bg-surface px-2 py-2 text-xs text-white" /></label>
          {(codigoBuscado || restauranteFiltro || driverFiltro || estadoFiltro !== 'TODOS' || desde || hasta) && <button type="button" onClick={() => { setCodigo(''); setCodigoBuscado(''); setRestauranteFiltro(''); setDriverFiltro(''); setEstadoFiltro('TODOS'); setDesde(''); setHasta('') }} className="rounded-lg border border-line px-3 py-2 text-xs text-gray-300 hover:border-brand">Limpiar</button>}
          <span className="text-xs text-gray-500">{totalActivos} activos · {finalizados.length} finalizados</span>
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
            onClick={() => void cargar()}
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
              <p className="text-gray-400">{filtros ? 'No hay pedidos activos con estos filtros' : 'No hay pedidos activos'}</p>
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
                    {filtros ? `${finalizados.length} encontrados` : `Últimos ${finalizados.length}`}
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
                  {finalizados.length ? finalizados.map((p) => (
                    <PedidoCard key={p.id} pedido={p} compact />
                  )) : <p className="p-5 text-center text-sm text-gray-500">No hay pedidos finalizados con estos filtros.</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

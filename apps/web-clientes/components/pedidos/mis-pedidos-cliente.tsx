'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCarrito } from '@/lib/carrito/store'
import { tiempoRelativo } from '@/lib/utils/fechas'

interface Pedido {
  id: string
  codigo: string
  subtotal: string
  total: string
  estado_global: string
  creado_en: string
  num_locales: number
  primer_restaurante: string
}

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'completados', label: 'Completados' },
]

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

export default function MisPedidosCliente() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [reordenando, setReordenando] = useState<string | null>(null)
  const agregar = useCarrito((s) => s.agregar)

  useEffect(() => {
    setLoading(true)
    const url =
      filtro === 'todos' ? '/api/pedidos' : `/api/pedidos?filtro=${filtro}`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPedidos(data.data)
      })
      .finally(() => setLoading(false))
  }, [filtro])

  async function reordenar(pedido: Pedido) {
    if (!confirm('¿Agregar los mismos platos al carrito?')) return
    setReordenando(pedido.id)

    try {
      const res = await fetch(`/api/pedidos/${pedido.id}`)
      const data = await res.json()

      if (!data.ok) {
        alert('No se pudo cargar el pedido')
        return
      }

      let totalItems = 0
      for (const sp of data.data.sub_pedidos) {
        for (const item of sp.items) {
          agregar({
            plato_id: item.id,
            plato_nombre: item.nombre_snapshot,
            plato_imagen: null,
            restaurante_id: sp.id,
            restaurante_slug: '',
            restaurante_nombre: sp.restaurante_nombre,
            precio_unitario: Number(item.precio_snapshot),
            cantidad: item.cantidad,
            notas: item.notas,
            opciones: item.opciones.map((o: any) => ({
              grupo_titulo: o.grupo_titulo_snapshot,
              choice_nombre: o.choice_nombre_snapshot,
              precio_extra: Number(o.precio_extra),
            })),
          })
          totalItems += item.cantidad
        }
      }

      alert(`✅ ${totalItems} items agregados al carrito`)
    } catch {
      alert('Error al reordenar')
    } finally {
      setReordenando(null)
    }
  }

  return (
    <div>
      {/* FILTROS */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const activo = filtro === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                activo
                  ? 'bg-brand text-black border-brand'
                  : 'bg-surface text-gray-400 border-line hover:border-brand/40'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface border border-line rounded-2xl p-4 animate-pulse"
            >
              <div className="h-4 bg-surface-light rounded w-24 mb-2" />
              <div className="h-3 bg-surface-light rounded w-40 mb-3" />
              <div className="h-5 bg-surface-light rounded w-32" />
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-10 md:p-16 text-center">
          <div className="text-6xl mb-4">
            {filtro === 'activos'
              ? '🎉'
              : filtro === 'completados'
              ? '📭'
              : '📦'}
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            {filtro === 'todos'
              ? 'Aún no tienes pedidos'
              : filtro === 'activos'
              ? '¡Todo al día!'
              : 'Sin pedidos completados'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {filtro === 'todos'
              ? 'Cuando hagas tu primer pedido aparecerá aquí'
              : filtro === 'activos'
              ? 'No hay pedidos en curso ahora mismo'
              : 'Los pedidos entregados se verán aquí'}
          </p>
          {filtro === 'todos' && (
            <Link
              href="/"
              className="inline-block bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Explorar restaurantes →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const esActivo = ![
              'ENTREGADO',
              'CANCELADO',
              'RECHAZADO',
              'PARCIAL',
            ].includes(p.estado_global)

            return (
              <Link
                key={p.id}
                href={`/pedido/${p.codigo}`}
                className="block bg-surface border border-line rounded-2xl p-4 hover:border-brand/40 transition-colors"
              >
                {/* HEADER */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm">
                        {p.codigo}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {tiempoRelativo(p.creado_en)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      🏪 {p.primer_restaurante}
                      {p.num_locales > 1 && (
                        <span className="text-purple-400 font-medium">
                          {' '}
                          +{p.num_locales - 1} más
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-brand text-lg">
                      S/ {Number(p.total).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* ESTADO */}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                      ESTADO_COLORES[p.estado_global] ||
                      ESTADO_COLORES.PENDIENTE
                    }`}
                  >
                    {ESTADO_LABELS[p.estado_global] || p.estado_global}
                  </span>
                  <span className="text-xs text-brand font-bold">
                    Ver detalle →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
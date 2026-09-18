'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultadoPlato from './resultado-plato'
import {
  RestauranteGrid,
  type RestauranteCardData,
} from '@/components/home/restaurante-card'

interface Plato {
  id: string
  nombre: string
  descripcion: string | null
  precio: string
  imagen_url: string | null
  tiempo_estimado: number | null
  restaurante_slug: string
  restaurante_nombre: string
}

interface Resultados {
  restaurantes: RestauranteCardData[]
  platos: Plato[]
}

export default function BuscarCliente() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qInicial = searchParams.get('q') || ''

  const [query, setQuery] = useState(qInicial)
  const [resultados, setResultados] = useState<Resultados>({
    restaurantes: [],
    platos: [],
  })
  const [loading, setLoading] = useState(false)
  const [busco, setBusco] = useState(false)

  // ============================================
  // Buscar con debounce
  // ============================================
  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados({ restaurantes: [], platos: [] })
      setBusco(false)
      return
    }

    setLoading(true)
    setBusco(true)

    const timer = setTimeout(() => {
      fetch(`/api/buscar?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setResultados(data.data)
          }
        })
        .finally(() => setLoading(false))

      // Actualizar URL
      router.replace(`/buscar?q=${encodeURIComponent(query.trim())}`, {
        scroll: false,
      })
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const totalResultados =
    resultados.restaurantes.length + resultados.platos.length

  return (
    <div>
      {/* BUSCADOR */}
      <div className="sticky top-[57px] z-20 bg-surface-dark/95 backdrop-blur-lg -mx-4 px-4 py-3 border-b border-line mb-4">
        <div className="flex items-center bg-surface border border-brand/40 rounded-xl px-3.5">
          <span className="text-brand mr-2 text-base">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Busca locales, platos y productos..."
            className="flex-1 bg-transparent py-3 text-white placeholder-gray-600 focus:outline-none text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-gray-500 hover:text-white p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ESTADOS */}

      {/* Sin búsqueda */}
      {!busco && (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🔍</p>
          <h2 className="text-lg font-bold text-white mb-1">
            ¿Qué se te antoja hoy?
          </h2>
          <p className="text-sm text-gray-500">
            Busca restaurantes, platos o productos
          </p>
        </div>
      )}

      {/* Cargando */}
      {busco && loading && (
        <div className="text-center py-12 text-gray-500 text-sm">
          Buscando...
        </div>
      )}

      {/* Sin resultados */}
      {busco && !loading && totalResultados === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">😕</p>
          <h2 className="text-base font-bold text-white mb-1">
            Sin resultados
          </h2>
          <p className="text-sm text-gray-500">
            No encontramos nada para "{query}"
          </p>
          <Link
            href="/"
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Explorar restaurantes →
          </Link>
        </div>
      )}

      {/* Resultados */}
      {busco && !loading && totalResultados > 0 && (
        <div className="space-y-6">
          {/* Restaurantes */}
          {resultados.restaurantes.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                🏪 Restaurantes
                <span className="text-xs text-gray-500 font-normal">
                  ({resultados.restaurantes.length})
                </span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {resultados.restaurantes.map((r) => (
                  <RestauranteGrid key={r.id} restaurante={r} />
                ))}
              </div>
            </section>
          )}

          {/* Platos */}
          {resultados.platos.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                🍽️ Platos
                <span className="text-xs text-gray-500 font-normal">
                  ({resultados.platos.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {resultados.platos.map((p) => (
                  <ResultadoPlato key={p.id} plato={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
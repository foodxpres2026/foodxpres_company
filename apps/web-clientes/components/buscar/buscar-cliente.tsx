'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ResultadoPlato from './resultado-plato'
import {
  RestauranteGrid,
  type RestauranteCardData,
} from '@/components/home/restaurante-card'
import Skeleton, { SkeletonResultado } from '@/components/ui/skeleton'

interface Categoria {
  id: string
  slug: string
  nombre: string
  emoji: string | null
}

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

export default function BuscarCliente({ categorias }: { categorias: Categoria[] }) {
  const searchParams = useSearchParams()
  const qInicial = searchParams.get('q') || ''
  const categoriaInicial = searchParams.get('categoria') || null

  const [query, setQuery] = useState(qInicial)
  const [resultados, setResultados] = useState<Resultados>({
    restaurantes: [],
    platos: [],
  })
  const [loading, setLoading] = useState(false)
  const [busco, setBusco] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(categoriaInicial)

  // ============================================
  // Buscar con debounce
  // ============================================
  useEffect(() => {
    const texto = query.trim()
    if (texto.length < 2 && !categoriaActiva) {
      setResultados({ restaurantes: [], platos: [] })
      setBusco(false)
      setLoading(false)
      window.history.replaceState(null, '', '/buscar')
      return
    }

    setLoading(true)
    setBusco(true)
    const controller = new AbortController()

    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (texto.length >= 2) params.set('q', texto)
      if (categoriaActiva) params.set('categoria', categoriaActiva)

      fetch(`/api/buscar?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setResultados(data.data)
          }
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setResultados({ restaurantes: [], platos: [] })
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })

      window.history.replaceState(null, '', `/buscar?${params.toString()}`)
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, categoriaActiva])

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

      <section className="mb-5">
        <h2 className="text-sm font-bold text-gray-300 mb-3">
          Explora todas las categorías
        </h2>
        <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-hide">
          <div className="flex w-max gap-2">
            <button
              type="button"
              aria-pressed={!categoriaActiva}
              onClick={() => setCategoriaActiva(null)}
              className={`flex min-w-20 flex-col items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
                !categoriaActiva
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line bg-surface text-gray-400 hover:border-brand/40'
              }`}
            >
              <span className="text-xl">🍽️</span>
              <span className="text-[11px] font-medium">Todos</span>
            </button>
            {categorias.map((categoria) => {
              const activa = categoriaActiva === categoria.slug
              return (
                <button
                  key={categoria.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCategoriaActiva(activa ? null : categoria.slug)}
                  className={`flex min-w-20 flex-col items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
                    activa
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-line bg-surface text-gray-400 hover:border-brand/40'
                  }`}
                >
                  <span className="text-xl">{categoria.emoji || '🍽️'}</span>
                  <span className="max-w-24 truncate text-[11px] font-medium">
                    {categoria.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ESTADOS */}

      {/* Sin búsqueda */}
      {!busco && (
        <p className="py-6 text-center text-sm text-gray-500">
          Busca restaurantes, platos o productos, o elige una categoría.
        </p>
      )}

      {/* Cargando */}
      {busco && loading && (
        <div className="space-y-2">
          <SkeletonResultado />
          <SkeletonResultado />
          <SkeletonResultado />
          <SkeletonResultado />
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
            {query.trim().length >= 2
              ? `No encontramos nada para “${query}”`
              : `No hay locales ni platos en ${categorias.find((c) => c.slug === categoriaActiva)?.nombre || 'esta categoría'}`}
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
        <div className="space-y-6 animate-fade-in">
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

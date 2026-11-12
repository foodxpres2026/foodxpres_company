'use client'

import { useEffect, useState } from 'react'
import CategoriasChips from './categorias-chips'
import {
  RestauranteHero,
  RestauranteGrid,
  type RestauranteCardData,
} from './restaurante-card'
import { useEnviosMultiples } from '@/hooks/use-envio'
import { useDireccionActual, type DireccionLocal } from '@/hooks/use-direccion-actual'
import { ABRIR_DIRECCION_EVENT } from '@/lib/direccion-events'

interface Props {
  abiertos: RestauranteCardData[]
  masPedidos: RestauranteCardData[]
  todos: RestauranteCardData[]
  categorias: { id: string; slug: string; nombre: string; emoji: string | null }[]
  categoriaInicial: string | null
  direccionDeBD: DireccionLocal | null
}

export default function HomeRestaurantes({
  abiertos,
  masPedidos,
  todos,
  categorias,
  categoriaInicial,
  direccionDeBD,
}: Props) {
  const [limiteLocales, setLimiteLocales] = useState(10)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(categoriaInicial)
  const direccionActual = useDireccionActual(direccionDeBD)

  useEffect(() => {
    setLimiteLocales(10)
  }, [categoriaActiva, todos.length])

  function seleccionarCategoria(slug: string | null) {
    setCategoriaActiva(slug)
    setLimiteLocales(10)
    window.history.replaceState(
      null,
      '',
      slug ? `/?categoria=${encodeURIComponent(slug)}` : '/'
    )
  }

  const localesFiltrados = categoriaActiva
    ? todos.filter((r) => r.categorias?.some((categoria) => categoria.slug === categoriaActiva))
    : todos
  const abiertosVisibles = categoriaActiva
    ? localesFiltrados.filter((r) => r.abierto)
    : abiertos
  const masPedidosVisibles = categoriaActiva
    ? abiertosVisibles.slice(2, 6)
    : masPedidos

  // Juntar TODOS los ids únicos para calcular envíos de una sola vez
  const todosLosIds = [
    ...new Set(
      [...abiertosVisibles, ...masPedidosVisibles, ...localesFiltrados].map((r) => r.id)
    ),
  ]

  const { envios } = useEnviosMultiples(
    todosLosIds,
    direccionActual?.lat ?? null,
    direccionActual?.lng ?? null
  )

  // Decorar cada restaurante con su costo de envío
  function decorar(r: RestauranteCardData): RestauranteCardData {
    const envio = envios[r.id]
    return {
      ...r,
      envio_costo: envio?.costo ?? null,
      envio_km: envio?.distancia_km ?? null,
    }
  }

  const abiertosDec = abiertosVisibles.map(decorar)
  const masPedidosDec = masPedidosVisibles.map(decorar)
  const todosDec = localesFiltrados.map(decorar)

  // Si no hay dirección, mostrar aviso
  const sinDireccion = !direccionActual

  return (
    <>
      <section className="mb-3">
        <h2 className="home-section-title text-base font-bold text-white mb-3">
          ¿Qué se te antoja? 🤔
        </h2>
      </section>

      <div className="home-category-bar sticky top-[57px] z-30 -mx-4 px-4 py-2 mb-6 bg-surface-dark/95 backdrop-blur-lg border-b border-line">
        <CategoriasChips
          categorias={categorias}
          activa={categoriaActiva}
          onSeleccionar={seleccionarCategoria}
        />
      </div>

      {categoriaActiva && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => seleccionarCategoria(null)}
            className="text-xs text-brand hover:underline"
          >
            ← Quitar filtro
          </button>
        </div>
      )}

      {/* AVISO SIN DIRECCIÓN */}
      {sinDireccion && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(ABRIR_DIRECCION_EVENT))}
          className="w-full text-left bg-jaguar/5 border border-jaguar/30 rounded-2xl p-4 mb-6 flex items-start gap-3 hover:bg-jaguar/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jaguar"
        >
          <span className="text-2xl">📍</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-jaguar text-sm">
              Agrega tu dirección
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Para ver el costo de delivery de cada restaurante
            </p>
          </div>
        </button>
      )}

      {/* SECCIÓN 1: ABIERTO AHORA */}
      {!categoriaActiva && abiertosDec.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="home-section-title text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              Abierto ahora
            </h2>
            <span className="text-xs text-gray-500">
              {abiertosDec.length} local{abiertosDec.length === 1 ? '' : 'es'}
            </span>
          </div>

          <div className="md:hidden">
            <RestauranteHero restaurante={abiertosDec[0]} />
          </div>

          <div className="hidden md:grid grid-cols-2 gap-4">
            {abiertosDec.slice(0, 2).map((r) => (
              <RestauranteHero key={r.id} restaurante={r} />
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 2: MÁS PEDIDOS */}
      {!categoriaActiva && masPedidosDec.length > 0 && (
        <section className="mb-8">
          <h2 className="home-section-title text-base font-bold text-white mb-3 flex items-center gap-2">
            🔥 Los más pedidos hoy
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {masPedidosDec.map((r) => (
              <RestauranteGrid key={r.id} restaurante={r} />
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 3: TODOS */}
      {todosDec.length > 0 && !categoriaActiva && (
        <section className="mb-8">
          <h2 className="home-section-title text-base font-bold text-white mb-3">
            🍽️ Todos los restaurantes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {todosDec.slice(0, limiteLocales).map((r) => (
              <RestauranteGrid key={r.id} restaurante={r} />
            ))}
          </div>
          {todosDec.length > limiteLocales && (
            <button
              type="button"
              onClick={() => setLimiteLocales((limite) => limite + 10)}
              className="mt-5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-brand transition-colors hover:border-brand/50 hover:bg-surface-light"
            >
              Ver más restaurantes
            </button>
          )}
        </section>
      )}

      {/* FILTRO POR CATEGORÍA */}
      {categoriaActiva && todosDec.length > 0 && (
        <section className="mb-8">
          <h2 className="home-section-title text-base font-bold text-white mb-3">
            🎯 Resultados ({todosDec.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {todosDec.slice(0, limiteLocales).map((r) => (
              <RestauranteGrid key={r.id} restaurante={r} />
            ))}
          </div>
          {todosDec.length > limiteLocales && (
            <button
              type="button"
              onClick={() => setLimiteLocales((limite) => limite + 10)}
              className="mt-5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-brand transition-colors hover:border-brand/50 hover:bg-surface-light"
            >
              Ver más restaurantes
            </button>
          )}
        </section>
      )}

      {/* SIN RESULTADOS */}
      {todosDec.length === 0 && (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-gray-400">
            {categoriaActiva
              ? 'No hay restaurantes en esta categoría'
              : 'No hay restaurantes disponibles'}
          </p>
          {categoriaActiva && (
            <button
              type="button"
              onClick={() => seleccionarCategoria(null)}
              className="text-brand hover:underline text-sm mt-3 inline-block"
            >
              Ver todos →
            </button>
          )}
        </div>
      )}
    </>
  )
}

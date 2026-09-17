'use client'

import Link from 'next/link'
import {
  RestauranteHero,
  RestauranteGrid,
  type RestauranteCardData,
} from './restaurante-card'
import { useEnviosMultiples } from '@/hooks/use-envio'
import { useDireccionActual, type DireccionLocal } from '@/hooks/use-direccion-actual'

interface Props {
  abiertos: RestauranteCardData[]
  masPedidos: RestauranteCardData[]
  todos: RestauranteCardData[]
  categoriaActiva?: string
  direccionDeBD: DireccionLocal | null
}

export default function HomeRestaurantes({
  abiertos,
  masPedidos,
  todos,
  categoriaActiva,
  direccionDeBD,
}: Props) {
  const direccionActual = useDireccionActual(direccionDeBD)

  // Juntar TODOS los ids únicos para calcular envíos de una sola vez
  const todosLosIds = [
    ...new Set(
      [...abiertos, ...masPedidos, ...todos].map((r) => r.id)
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

  const abiertosDec = abiertos.map(decorar)
  const masPedidosDec = masPedidos.map(decorar)
  const todosDec = todos.map(decorar)

  // Si no hay dirección, mostrar aviso
  const sinDireccion = !direccionActual

  return (
    <>
      {/* AVISO SIN DIRECCIÓN */}
      {sinDireccion && (
        <div className="bg-jaguar/5 border border-jaguar/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">📍</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-jaguar text-sm">
              Agrega tu dirección
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Para ver el costo de delivery de cada restaurante
            </p>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: ABIERTO AHORA */}
      {abiertosDec.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
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
      {masPedidosDec.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
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
          <h2 className="text-base font-bold text-white mb-3">
            🍽️ Todos los restaurantes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {todosDec.map((r) => (
              <RestauranteGrid key={r.id} restaurante={r} />
            ))}
          </div>
        </section>
      )}

      {/* FILTRO POR CATEGORÍA */}
      {categoriaActiva && todosDec.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-white mb-3">
            🎯 Resultados ({todosDec.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {todosDec.map((r) => (
              <RestauranteGrid key={r.id} restaurante={r} />
            ))}
          </div>
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
            <Link
              href="/"
              className="text-brand hover:underline text-sm mt-3 inline-block"
            >
              Ver todos →
            </Link>
          )}
        </div>
      )}
    </>
  )
}
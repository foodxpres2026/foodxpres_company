'use client'

import Link from 'next/link'

export interface RestauranteCardData {
  id: string
  slug: string
  nombre: string
  subtitulo: string | null
  banner_url: string | null
  logo_url: string | null
  tiempo_estimado: string | null
  monto_minimo: string
  abierto: boolean
  categorias?: { id: string; slug?: string; nombre: string; emoji: string | null }[]
  // Envío (calculado dinámicamente)
  envio_costo?: number | null
  envio_km?: number | null
}

// ============================================
// HERO
// ============================================
export function RestauranteHero({
  restaurante,
}: {
  restaurante: RestauranteCardData
}) {
  return (
    <Link
      href={`/restaurante/${restaurante.slug}`}
      className="home-restaurant-hero block relative h-44 md:h-64 rounded-2xl overflow-hidden group"
    >
      {restaurante.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={restaurante.banner_url}
          alt={restaurante.nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-brand/30 to-brand/5" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {!restaurante.abierto && (
        <div className="absolute top-3 left-3 bg-gray-900/90 backdrop-blur text-gray-400 text-xs font-bold px-3 py-1.5 rounded-full">
          🔒 Cerrado
        </div>
      )}

      {restaurante.abierto && (
        <div className="absolute top-3 left-3 bg-brand text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          Abierto ahora
        </div>
      )}

      {/* ENVÍO (esquina superior derecha) */}
      {restaurante.envio_costo != null && (
        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
          🛵 S/ {restaurante.envio_costo.toFixed(2)}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 overflow-hidden rounded-xl border-2 border-white/20 bg-white p-1 flex items-center justify-center">
            {restaurante.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurante.logo_url} alt={restaurante.nombre} className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-lg bg-brand/20 text-xl md:text-2xl">
                🏪
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-xl font-black text-white truncate">
              {restaurante.nombre}
            </h3>
            {restaurante.subtitulo && (
              <p className="text-[11px] md:text-xs text-gray-300 truncate">
                {restaurante.subtitulo}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] md:text-xs text-gray-300">
          {restaurante.tiempo_estimado && (
            <span>⏱ {restaurante.tiempo_estimado}</span>
          )}
          <span className="text-brand font-bold ml-auto">
            Mín. S/ {Number(restaurante.monto_minimo).toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ============================================
// GRID
// ============================================
export function RestauranteGrid({
  restaurante,
}: {
  restaurante: RestauranteCardData
}) {
  return (
    <Link
      href={`/restaurante/${restaurante.slug}`}
      className="home-restaurant-card block bg-surface border border-line rounded-2xl overflow-hidden hover:border-brand/40 transition-colors group"
    >
      <div className="relative h-32 md:h-36 overflow-hidden">
        {restaurante.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurante.banner_url}
            alt={restaurante.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/30 to-brand/5 flex items-center justify-center text-5xl">
            🏪
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {!restaurante.abierto && (
          <div className="absolute top-2 left-2 bg-gray-900/90 backdrop-blur text-gray-400 text-[10px] font-bold px-2 py-1 rounded-full">
            Cerrado
          </div>
        )}
        {restaurante.abierto && (
          <div className="absolute top-2 left-2 bg-brand text-black text-[10px] font-bold px-2 py-1 rounded-full">
            ● Abierto
          </div>
        )}

        {/* ENVÍO */}
        {restaurante.envio_costo != null && (
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full">
            🛵 S/ {restaurante.envio_costo.toFixed(2)}
          </div>
        )}

      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
          {restaurante.nombre}
        </h3>
        <div className="mt-1 grid min-h-[76px] md:min-h-[88px] grid-cols-[minmax(0,1fr)_56px] md:grid-cols-[minmax(0,1fr)_72px] items-start gap-2">
          <div className="min-w-0 self-stretch flex flex-col justify-start gap-1" aria-label="Categorías del local">
            {restaurante.categorias?.length ? restaurante.categorias.slice(0, 3).map((categoria) => (
              <span key={categoria.id} className="max-w-full truncate rounded-md bg-surface-dark px-1.5 py-1 text-[10px] leading-3 text-gray-400">
                {categoria.emoji ? `${categoria.emoji} ` : ''}{categoria.nombre}
              </span>
            )) : (
              <p className="text-[10px] leading-4 text-gray-500 line-clamp-3">
                {restaurante.subtitulo || 'Restaurante'}
              </p>
            )}
          </div>
          <div className="w-14 md:w-[72px] flex flex-col items-center justify-start gap-1">
            <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white p-1 shadow-md flex items-center justify-center">
              {restaurante.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurante.logo_url} alt={`Logo de ${restaurante.nombre}`} className="h-full w-full object-contain" />
              ) : (
                <span role="img" aria-label={`Logo de ${restaurante.nombre}`} className="flex h-full w-full items-center justify-center rounded-lg bg-brand/15 text-2xl">
                  🏪
                </span>
              )}
            </div>
            {restaurante.tiempo_estimado && (
              <span className="w-full text-center text-[9px] leading-tight text-gray-400 line-clamp-2">
                ⏱ {restaurante.tiempo_estimado}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

'use client'

import Link from 'next/link'

export interface RestauranteCardData {
  id: string
  slug: string
  nombre: string
  subtitulo: string | null
  banner_url: string | null
  logo_url: string | null
  calificacion: string
  num_resenas: number
  tiempo_estimado: string | null
  monto_minimo: string
  abierto: boolean
}

// ============================================
// HERO (tarjeta grande para "Abierto ahora")
// ============================================
export function RestauranteHero({
  restaurante,
}: {
  restaurante: RestauranteCardData
}) {
  return (
    <Link
      href={`/restaurante/${restaurante.slug}`}
      className="block relative h-44 md:h-64 rounded-2xl overflow-hidden group"
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

      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <div className="flex items-center gap-3 mb-2">
          {restaurante.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurante.logo_url}
              alt={restaurante.nombre}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border-2 border-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-brand/20 border-2 border-white/20 flex items-center justify-center text-xl md:text-2xl flex-shrink-0">
              🏪
            </div>
          )}
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
          <span className="flex items-center gap-1">
            ⭐{' '}
            <strong className="text-white">
              {Number(restaurante.calificacion).toFixed(1)}
            </strong>
            {restaurante.num_resenas > 0 && (
              <span className="text-gray-500">({restaurante.num_resenas})</span>
            )}
          </span>
          {restaurante.tiempo_estimado && (
            <span>⏱ {restaurante.tiempo_estimado}</span>
          )}
          <span className="text-brand font-bold ml-auto">
            S/ {Number(restaurante.monto_minimo).toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ============================================
// GRID (tarjeta pequeña para listas)
// ============================================
export function RestauranteGrid({
  restaurante,
}: {
  restaurante: RestauranteCardData
}) {
  return (
    <Link
      href={`/restaurante/${restaurante.slug}`}
      className="block bg-surface border border-line rounded-2xl overflow-hidden hover:border-brand/40 transition-colors group"
    >
      {/* IMAGEN */}
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

        {/* LOGO pequeño */}
        {restaurante.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurante.logo_url}
            alt={restaurante.nombre}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-lg object-cover border-2 border-white/30"
          />
        )}
      </div>

      {/* INFO */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-white truncate">
          {restaurante.nombre}
        </h3>
        <p className="text-[11px] text-gray-500 truncate mb-2">
          {restaurante.subtitulo || 'Restaurante'}
        </p>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-400 flex items-center gap-1">
            ⭐ {Number(restaurante.calificacion).toFixed(1)}
          </span>
          {restaurante.tiempo_estimado && (
            <span className="text-gray-500">
              ⏱ {restaurante.tiempo_estimado}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
'use client'

import Link from 'next/link'

interface Props {
  nombre: string
  subtitulo: string | null
  banner_url: string | null
  logo_url: string | null
  calificacion: string
  num_resenas: number
  tiempo_estimado: string | null
  monto_minimo: string
  abierto: boolean
  horarioHoy: string | null
  direccion: string | null
}

export default function HeaderRestaurante({
  nombre,
  subtitulo,
  banner_url,
  logo_url,
  calificacion,
  num_resenas,
  tiempo_estimado,
  monto_minimo,
  abierto,
  horarioHoy,
  direccion,
}: Props) {
  return (
    <div className="relative">
      {/* BANNER */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        {banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner_url}
            alt={nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/30 to-brand/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-black/30 to-black/40" />

        {/* Botón atrás */}
        <Link
          href="/"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          aria-label="Volver"
        >
          ←
        </Link>
      </div>

      {/* CARD INFO (flotante) */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-surface border border-line rounded-3xl p-5 md:p-6 shadow-2xl">
          <div className="flex items-start gap-4 mb-4">
            {/* LOGO */}
            <div className="flex-shrink-0">
              {logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo_url}
                  alt={nombre}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-line-light"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-brand/20 border-2 border-line-light flex items-center justify-center text-3xl">
                  🏪
                </div>
              )}
            </div>

            {/* INFO */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-black text-white leading-tight">
                {nombre}
              </h1>
              {subtitulo && (
                <p className="text-sm text-gray-400 mt-0.5">{subtitulo}</p>
              )}

              {/* Estado abierto/cerrado */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {abierto ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    Abierto ahora
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">
                    🔒 Cerrado
                  </span>
                )}
                {horarioHoy && (
                  <span className="text-xs text-gray-500">
                    {horarioHoy}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-line">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Rating
              </p>
              <p className="text-sm font-bold text-white">
                ⭐ {Number(calificacion).toFixed(1)}
              </p>
              {num_resenas > 0 && (
                <p className="text-[10px] text-gray-600">
                  {num_resenas} reseñas
                </p>
              )}
            </div>
            <div className="text-center border-x border-line">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Tiempo
              </p>
              <p className="text-sm font-bold text-white">
                ⏱ {tiempo_estimado || '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Mínimo
              </p>
              <p className="text-sm font-bold text-brand">
                S/ {Number(monto_minimo).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Dirección */}
          {direccion && (
            <div className="mt-4 pt-4 border-t border-line flex items-start gap-2 text-xs text-gray-500">
              <span>📍</span>
              <span className="flex-1">{direccion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
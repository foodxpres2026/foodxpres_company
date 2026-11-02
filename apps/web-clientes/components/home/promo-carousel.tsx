'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Promo {
  id: string
  badge: string | null
  titulo: string
  subtitulo: string | null
  cta_texto: string | null
  imagen_url: string | null
  gradiente_css: string | null
  link_url: string | null
}

export default function PromoCarousel({ promos }: { promos: Promo[] }) {
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    if (promos.length <= 1) return
    const interval = setInterval(() => {
      setActivo((prev) => (prev + 1) % promos.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [promos.length, activo])

  if (promos.length === 0) {
    return (
      <div className="mx-auto h-40 md:h-[300px] lg:h-[360px] max-w-4xl rounded-[26px] overflow-hidden relative bg-gradient-to-br from-brand/30 to-brand/5 border border-brand/20 shadow-[0_24px_70px_-38px_rgba(126,211,33,0.55)]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10px] bg-brand text-black font-bold px-2 py-1 rounded-full inline-block mb-2">
            🎉 BIENVENIDO
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
            El sabor de Pucallpa
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Descubre los mejores restaurantes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="promo-frame relative h-40 md:h-[300px] lg:h-[360px] rounded-[26px] overflow-hidden bg-surface border border-white/10 shadow-[0_24px_70px_-38px_rgba(126,211,33,0.55)] isolate">
        {promos.map((promo, i) => (
          <Link
            key={promo.id}
            href={promo.link_url || '/'}
            tabIndex={i === activo ? 0 : -1}
            aria-hidden={i !== activo}
            className={`absolute inset-0 block transition-[opacity,transform] duration-700 ease-out ${
              i === activo ? 'z-10 opacity-100 scale-100' : 'z-0 opacity-0 scale-[1.025] pointer-events-none'
            }`}
          >
            {promo.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promo.imagen_url}
                alt={promo.titulo}
                className={`w-full h-full object-cover ${i === activo ? 'promo-image-motion' : ''}`}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background:
                    promo.gradiente_css ||
                    'linear-gradient(135deg, #7ED321, #4A9A2C)',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

            <div className={`absolute bottom-0 left-0 right-0 p-5 md:p-8 ${i === activo ? 'promo-content-motion' : ''}`}>
              {promo.badge && (
                <span className="text-[10px] md:text-xs bg-brand text-black font-bold px-2.5 py-1 rounded-full inline-flex items-center mb-2 shadow-lg shadow-black/20">
                  {promo.badge}
                </span>
              )}
              <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg">
                {promo.titulo}
              </h2>
              {promo.subtitulo && (
                <p className="text-sm md:text-base text-gray-200 mt-1 max-w-2xl drop-shadow-md">{promo.subtitulo}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {promos.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {promos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivo(i)}
              className={`relative h-2 overflow-hidden rounded-full transition-all duration-300 ${
                i === activo ? 'bg-gray-700 w-12' : 'bg-gray-700/70 w-2 hover:bg-gray-500'
              }`}
              aria-label={`Mostrar promoción ${i + 1}`}
              aria-pressed={i === activo}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 bg-brand rounded-full ${i === activo ? 'promo-progress' : 'w-0'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

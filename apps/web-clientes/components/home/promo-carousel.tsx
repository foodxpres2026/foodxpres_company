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
      <div className="mx-auto h-40 md:h-64 lg:h-72 max-w-4xl rounded-2xl overflow-hidden relative bg-gradient-to-br from-brand/30 to-brand/5 border border-line">
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
      <div className="promo-frame relative h-40 md:h-64 lg:h-72 rounded-2xl overflow-hidden bg-surface border border-line isolate">
        {promos.map((promo, i) => (
          <Link
            key={promo.id}
            href={promo.link_url || '/'}
            tabIndex={i === activo ? 0 : -1}
            aria-hidden={i !== activo}
            className={`absolute inset-0 block transition-[opacity,transform] duration-700 ease-out md:grid md:grid-cols-2 ${
              i === activo ? 'z-10 opacity-100 translate-x-0' : 'z-0 opacity-0 translate-x-2 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 md:relative md:inset-auto md:min-w-0 md:overflow-hidden">
              {promo.imagen_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={promo.imagen_url} alt={promo.titulo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: promo.gradiente_css || 'linear-gradient(135deg, #7ED321, #4A9A2C)' }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent md:hidden" />
              <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-black/10 to-black/25" />

              <div className={`absolute bottom-0 left-0 right-0 p-5 md:hidden ${i === activo ? 'promo-content-motion' : ''}`}>
                {promo.badge && <span className="text-[10px] bg-brand text-black font-bold px-2.5 py-1 rounded-full inline-flex items-center mb-2">{promo.badge}</span>}
                <h2 className="text-xl font-black text-white leading-tight">{promo.titulo}</h2>
                {promo.subtitulo && <p className="text-sm text-gray-200 mt-1 line-clamp-2">{promo.subtitulo}</p>}
              </div>
            </div>

            <div className={`hidden md:flex min-w-0 flex-col justify-between p-5 lg:p-6 bg-gradient-to-br from-[#19252d] via-[#141c21] to-[#101510] ${i === activo ? 'promo-content-motion' : ''}`}>
              <div>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-brand mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  {promo.badge || 'Destacado en FoodXpres'}
                </span>
                <h2 className="text-xl lg:text-2xl font-black text-white leading-tight line-clamp-2">{promo.titulo}</h2>
                {promo.subtitulo && <p className="text-sm text-gray-300 mt-2 leading-relaxed line-clamp-3">{promo.subtitulo}</p>}
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Promoción</span>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-brand">
                  {promo.cta_texto || 'Ver promoción'} <span aria-hidden="true">→</span>
                </span>
              </div>
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

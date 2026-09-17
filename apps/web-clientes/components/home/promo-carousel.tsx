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
}

export default function PromoCarousel({ promos }: { promos: Promo[] }) {
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    if (promos.length <= 1) return
    const interval = setInterval(() => {
      setActivo((prev) => (prev + 1) % promos.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [promos.length])

  if (promos.length === 0) {
    // Fallback con promos decorativas si no hay en BD
    return (
      <div className="h-40 md:h-56 rounded-2xl overflow-hidden relative bg-gradient-to-br from-brand/30 to-brand/5 border border-brand/20">
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
    <div className="relative">
      <div className="relative h-40 md:h-56 rounded-2xl overflow-hidden bg-surface">
        {promos.map((promo, i) => (
          <Link
            key={promo.id}
            href="/buscar"
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === activo ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {promo.imagen_url ? (
              <img
                src={promo.imagen_url}
                alt={promo.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: promo.gradiente_css || 'linear-gradient(135deg, #7ED321, #4A9A2C)',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5">
              {promo.badge && (
                <span className="text-[10px] bg-brand text-black font-bold px-2 py-1 rounded-full inline-block mb-2">
                  {promo.badge}
                </span>
              )}
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                {promo.titulo}
              </h2>
              {promo.subtitulo && (
                <p className="text-sm text-gray-300 mt-1">
                  {promo.subtitulo}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* DOTS */}
      {promos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {promos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activo ? 'bg-brand w-6' : 'bg-gray-700 w-1.5'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
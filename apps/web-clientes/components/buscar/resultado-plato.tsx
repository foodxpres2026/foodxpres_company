'use client'

import Link from 'next/link'

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

export default function ResultadoPlato({ plato }: { plato: Plato }) {
  return (
    <Link
      href={`/restaurante/${plato.restaurante_slug}`}
      className="flex gap-3 p-3 bg-surface border border-line rounded-xl hover:border-brand/40 transition-colors"
    >
      {/* Imagen */}
      <div className="w-16 h-16 rounded-xl bg-surface-dark border border-line overflow-hidden flex-shrink-0">
        {plato.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plato.imagen_url}
            alt={plato.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
            🍽️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white truncate">
          {plato.nombre}
        </h4>
        {plato.descripcion && (
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {plato.descripcion}
          </p>
        )}
        <p className="text-[10px] text-gray-600 truncate mt-0.5">
          🏪 {plato.restaurante_nombre}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-brand">
            S/ {Number(plato.precio).toFixed(2)}
          </span>
          {plato.tiempo_estimado && (
            <span className="text-[10px] text-gray-500">
              ⏱ {plato.tiempo_estimado} min
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
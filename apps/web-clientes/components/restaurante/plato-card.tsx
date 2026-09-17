'use client'

import { useCarrito } from '@/lib/carrito/store'

export interface Plato {
  id: string
  nombre: string
  descripcion: string | null
  precio: string
  imagen_url: string | null
  tiempo_estimado: number | null
  disponible: boolean
  subcategoria_id: string | null
  tiene_opciones: boolean
}

interface Props {
  plato: Plato
  restaurante: {
    id: string
    slug: string
    nombre: string
  }
  onAbrirOpciones: (plato: Plato) => void
}

export default function PlatoCard({ plato, restaurante, onAbrirOpciones }: Props) {
  const agregar = useCarrito((s) => s.agregar)
  const items = useCarrito((s) => s.items)

  // Contar cuántas unidades de este plato sin opciones hay en el carrito
  const enCarrito = items
    .filter((i) => i.plato_id === plato.id && i.opciones.length === 0)
    .reduce((sum, i) => sum + i.cantidad, 0)

  function handleAgregar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!plato.disponible) return

    // Si tiene opciones obligatorias → abrir modal
    if (plato.tiene_opciones) {
      onAbrirOpciones(plato)
      return
    }

    // Si no tiene opciones → agregar directo
    agregar({
      plato_id: plato.id,
      plato_nombre: plato.nombre,
      plato_imagen: plato.imagen_url,
      restaurante_id: restaurante.id,
      restaurante_slug: restaurante.slug,
      restaurante_nombre: restaurante.nombre,
      precio_unitario: Number(plato.precio),
      cantidad: 1,
      notas: null,
      opciones: [],
    })
  }

  return (
    <div
      className={`bg-surface border border-line rounded-2xl overflow-hidden transition-colors ${
        plato.disponible ? 'hover:border-brand/40' : 'opacity-60'
      }`}
    >
      <div className="flex">
        {/* IMAGEN */}
        <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
          {plato.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={plato.imagen_url}
              alt={plato.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand/20 to-transparent flex items-center justify-center text-3xl">
              🍽️
            </div>
          )}
          {!plato.disponible && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-400 bg-gray-900 px-2 py-1 rounded-full">
                No disponible
              </span>
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex-1 p-3 flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1">
            {plato.nombre}
          </h3>

          {plato.descripcion && (
            <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
              {plato.descripcion}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-auto mb-2">
            {plato.tiempo_estimado && (
              <span className="text-[10px] text-gray-500">
                ⏱ {plato.tiempo_estimado} min
              </span>
            )}
            {plato.tiene_opciones && (
              <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold">
                ⚙️ Configurable
              </span>
            )}
          </div>

          {/* PRECIO + BOTÓN */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-black text-brand text-base md:text-lg">
              S/ {Number(plato.precio).toFixed(2)}
            </span>

            {plato.disponible && (
              <button
                type="button"
                onClick={handleAgregar}
                className="relative bg-brand hover:bg-brand-dark text-black font-bold text-sm w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                aria-label={`Agregar ${plato.nombre}`}
              >
                +
                {enCarrito > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-brand text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface">
                    {enCarrito}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
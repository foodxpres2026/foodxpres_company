'use client'

import { useCarrito } from '@/lib/carrito/store'

export default function CarritoItems() {
  const items = useCarrito((s) => s.items)
  const cambiarCantidad = useCarrito((s) => s.cambiarCantidad)
  const eliminar = useCarrito((s) => s.eliminar)

  // Agrupar por restaurante
  const grupos = items.reduce<
    Record<
      string,
      {
        restaurante_id: string
        restaurante_nombre: string
        restaurante_slug: string
        items: typeof items
      }
    >
  >((acc, item) => {
    const key = item.restaurante_id
    if (!acc[key]) {
      acc[key] = {
        restaurante_id: item.restaurante_id,
        restaurante_nombre: item.restaurante_nombre,
        restaurante_slug: item.restaurante_slug,
        items: [],
      }
    }
    acc[key].items.push(item)
    return acc
  }, {})

  const gruposArr = Object.values(grupos)

  return (
    <div className="space-y-4">
      {gruposArr.map((grupo) => (
        <div
          key={grupo.restaurante_id}
          className="bg-surface border border-line rounded-2xl overflow-hidden"
        >
          {/* HEADER del restaurante */}
          <div className="bg-surface-dark px-4 py-3 border-b border-line flex items-center gap-2">
            <span className="text-base">🏪</span>
            <h3 className="font-bold text-white text-sm truncate">
              {grupo.restaurante_nombre}
            </h3>
          </div>

          {/* Items */}
          <div className="divide-y divide-line">
            {grupo.items.map((item) => {
              const subtotalItem = item.precio_unitario * item.cantidad

              return (
                <div key={item.id} className="p-3 flex gap-3">
                  {/* Imagen */}
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-surface-dark border border-line overflow-hidden flex-shrink-0">
                    {item.plato_imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.plato_imagen}
                        alt={item.plato_nombre}
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
                      {item.plato_nombre}
                    </h4>

                    {/* Opciones */}
                    {item.opciones.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.opciones.map((op, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-surface-dark border border-line text-gray-400 px-1.5 py-0.5 rounded"
                          >
                            {op.choice_nombre}
                            {op.precio_extra > 0 && (
                              <span className="text-brand ml-1">
                                +S/ {op.precio_extra.toFixed(2)}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.notas && (
                      <p className="text-[11px] text-yellow-500 mt-1">
                        📝 {item.notas}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-1">
                      S/ {item.precio_unitario.toFixed(2)} c/u
                    </p>

                    {/* Controles */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      {/* Cantidad */}
                      <div className="flex items-center gap-1 bg-surface-dark border border-line rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            cambiarCantidad(item.id, item.cantidad - 1)
                          }
                          className="w-8 h-8 text-white font-bold hover:bg-surface-light rounded-l-lg transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-white">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            cambiarCantidad(item.id, item.cantidad + 1)
                          }
                          className="w-8 h-8 text-white font-bold hover:bg-surface-light rounded-r-lg transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Precio + eliminar */}
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-brand text-sm">
                          S/ {subtotalItem.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminar(item.id)}
                          className="text-gray-500 hover:text-danger transition-colors p-1"
                          aria-label="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
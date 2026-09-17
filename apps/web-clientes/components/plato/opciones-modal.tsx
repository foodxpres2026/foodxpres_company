'use client'

import { useEffect, useState } from 'react'
import { useCarrito, type OpcionElegida } from '@/lib/carrito/store'

interface Choice {
  id: string
  nombre: string
  precio_extra: string
}

interface GrupoOpcion {
  id: string
  titulo: string
  requerido: boolean
  minimo: number
  maximo: number
  choices: Choice[]
}

interface Plato {
  id: string
  nombre: string
  descripcion: string | null
  precio: string
  imagen_url: string | null
  tiempo_estimado: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  plato: Plato | null
  grupos: GrupoOpcion[]
  restaurante: {
    id: string
    slug: string
    nombre: string
  }
}

export default function OpcionesModal({
  open,
  onClose,
  plato,
  grupos,
  restaurante,
}: Props) {
  const agregar = useCarrito((s) => s.agregar)

  const [selecciones, setSelecciones] = useState<Record<string, Choice[]>>({})
  const [cantidad, setCantidad] = useState(1)
  const [notas, setNotas] = useState('')

  // Resetear al abrir
  useEffect(() => {
    if (open && plato) {
      setSelecciones({})
      setCantidad(1)
      setNotas('')
    }
  }, [open, plato])

  // Bloquear scroll del body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !plato) return null

  // ⚡ Capturamos una referencia no-null para que TypeScript no se confunda
  const platoActual: Plato = plato

  function toggleChoice(grupo: GrupoOpcion, choice: Choice) {
    const actuales = selecciones[grupo.id] || []
    const yaElegido = actuales.find((c) => c.id === choice.id)

    if (yaElegido) {
      setSelecciones({
        ...selecciones,
        [grupo.id]: actuales.filter((c) => c.id !== choice.id),
      })
      return
    }

    if (grupo.maximo === 1) {
      setSelecciones({
        ...selecciones,
        [grupo.id]: [choice],
      })
      return
    }

    if (actuales.length >= grupo.maximo) return

    setSelecciones({
      ...selecciones,
      [grupo.id]: [...actuales, choice],
    })
  }

  // Validar
  const gruposCompletos = grupos.every((g) => {
    if (!g.requerido && (selecciones[g.id]?.length || 0) === 0) return true
    const n = selecciones[g.id]?.length || 0
    if (g.requerido && n < g.minimo) return false
    return n >= g.minimo && n <= g.maximo
  })

  // Calcular precio
  const precioBase = Number(platoActual.precio)
  const extraPorUnidad = Object.values(selecciones)
    .flat()
    .reduce((sum, c) => sum + Number(c.precio_extra), 0)
  const precioUnidad = precioBase + extraPorUnidad
  const precioTotal = precioUnidad * cantidad

  function handleAgregar() {
    if (!gruposCompletos) return

    const opcionesElegidas: OpcionElegida[] = []
    for (const grupo of grupos) {
      const choices = selecciones[grupo.id] || []
      for (const choice of choices) {
        opcionesElegidas.push({
          grupo_titulo: grupo.titulo,
          choice_nombre: choice.nombre,
          precio_extra: Number(choice.precio_extra),
        })
      }
    }

    agregar({
      plato_id: platoActual.id,
      plato_nombre: platoActual.nombre,
      plato_imagen: platoActual.imagen_url,
      restaurante_id: restaurante.id,
      restaurante_slug: restaurante.slug,
      restaurante_nombre: restaurante.nombre,
      precio_unitario: precioUnidad,
      cantidad,
      notas: notas.trim() || null,
      opciones: opcionesElegidas,
    })

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-12 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white leading-tight">
              {platoActual.nombre}
            </h2>
            {platoActual.descripcion && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {platoActual.descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none p-1 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
          {grupos.map((grupo) => {
            const actuales = selecciones[grupo.id] || []
            const completo = actuales.length >= grupo.minimo

            return (
              <div key={grupo.id}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm">
                      {grupo.titulo}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {grupo.maximo === 1
                        ? 'Elige 1 opción'
                        : `Elige entre ${grupo.minimo} y ${grupo.maximo}`}
                      {grupo.requerido && ' · Obligatorio'}
                    </p>
                  </div>
                  {grupo.requerido ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                        completo
                          ? 'bg-brand/15 text-brand'
                          : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {completo ? '✓ Listo' : 'Requerido'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-bold flex-shrink-0">
                      Opcional
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {grupo.choices.map((choice) => {
                    const elegido = actuales.some((c) => c.id === choice.id)
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => toggleChoice(grupo, choice)}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left ${
                          elegido
                            ? 'border-brand bg-brand/5'
                            : 'border-line-light bg-surface-dark hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              elegido
                                ? 'border-brand bg-brand'
                                : 'border-gray-700'
                            }`}
                          >
                            {elegido && (
                              <span className="text-black text-xs font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              elegido
                                ? 'text-white font-medium'
                                : 'text-gray-300'
                            }`}
                          >
                            {choice.nombre}
                          </span>
                        </div>
                        {Number(choice.precio_extra) > 0 && (
                          <span
                            className={`text-xs font-bold flex-shrink-0 ${
                              elegido ? 'text-brand' : 'text-gray-500'
                            }`}
                          >
                            +S/ {Number(choice.precio_extra).toFixed(2)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Notas */}
          <div>
            <h3 className="font-bold text-white text-sm mb-2">
              Notas para este producto
            </h3>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value.slice(0, 100))}
              placeholder="Comentarios sobre tu pedido"
              rows={2}
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand resize-none text-sm"
            />
            <p className="text-[10px] text-gray-600 text-right mt-1">
              {notas.length} / 100
            </p>
          </div>
        </div>

        {/* Footer sticky */}
        <div className="p-4 md:p-5 border-t border-line bg-surface flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-dark border border-line rounded-xl p-1">
            <button
              type="button"
              onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              disabled={cantidad <= 1}
              className="w-9 h-9 rounded-lg text-white font-bold disabled:opacity-30 hover:bg-surface-light transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-bold text-white">
              {cantidad}
            </span>
            <button
              type="button"
              onClick={() => setCantidad(cantidad + 1)}
              className="w-9 h-9 rounded-lg text-white font-bold hover:bg-surface-light transition-colors"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAgregar}
            disabled={!gruposCompletos}
            className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-brand/30 disabled:text-black/50 text-black font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-between px-4"
          >
            <span className="text-sm">Agregar</span>
            <span className="font-black">
              S/ {precioTotal.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
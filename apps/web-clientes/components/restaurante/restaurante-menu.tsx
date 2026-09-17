'use client'

import { useState } from 'react'
import PlatoCard, { type Plato } from './plato-card'
import OpcionesModal from '@/components/plato/opciones-modal'

interface Subcategoria {
  id: string
  nombre: string
  orden: number
}

interface PlatoCompleto extends Plato {
  grupos: {
    id: string
    titulo: string
    requerido: boolean
    minimo: number
    maximo: number
    choices: { id: string; nombre: string; precio_extra: string }[]
  }[]
}

interface Props {
  subcategorias: Subcategoria[]
  platos: PlatoCompleto[]
  restaurante: { id: string; slug: string; nombre: string }
  abierto: boolean
}

export default function RestauranteMenu({
  subcategorias,
  platos,
  restaurante,
  abierto,
}: Props) {
  const [platoSeleccionado, setPlatoSeleccionado] =
    useState<PlatoCompleto | null>(null)

  // Agrupar platos por subcategoría
  const grupos = [
    ...subcategorias.map((sub) => ({
      id: sub.id,
      nombre: sub.nombre,
      platos: platos.filter((p) => p.subcategoria_id === sub.id),
    })),
    {
      id: 'sin-categoria',
      nombre: 'Otros',
      platos: platos.filter((p) => !p.subcategoria_id),
    },
  ].filter((g) => g.platos.length > 0)

  if (platos.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-12 text-center mt-6">
        <p className="text-4xl mb-2">🍽️</p>
        <p className="text-gray-400">
          Este restaurante aún no tiene platos
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 mt-6">
        {grupos.map((grupo) => (
          <section
            key={grupo.id}
            id={`subcat-${grupo.id}`}
            className="scroll-mt-32"
          >
            <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
              {grupo.nombre}
              <span className="text-xs font-medium text-gray-500">
                {grupo.platos.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grupo.platos.map((plato) => (
                <PlatoCard
                  key={plato.id}
                  plato={plato}
                  restaurante={restaurante}
                  onAbrirOpciones={(p) =>
                    setPlatoSeleccionado(
                      platos.find((x) => x.id === p.id) || null
                    )
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* MODAL DE OPCIONES */}
      <OpcionesModal
        open={!!platoSeleccionado}
        onClose={() => setPlatoSeleccionado(null)}
        plato={platoSeleccionado}
        grupos={platoSeleccionado?.grupos || []}
        restaurante={restaurante}
      />
    </>
  )
}
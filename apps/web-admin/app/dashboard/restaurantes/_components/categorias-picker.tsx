'use client'

import { useEffect, useState } from 'react'

interface Categoria {
  id: string
  slug: string
  nombre: string
  emoji: string | null
}

export default function CategoriasPicker({
  seleccionadas,
  onChange,
}: {
  seleccionadas: string[]
  onChange: (ids: string[]) => void
}) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categorias')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setCategorias(data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  function toggle(id: string) {
    if (seleccionadas.includes(id)) {
      onChange(seleccionadas.filter((x) => x !== id))
    } else {
      onChange([...seleccionadas, id])
    }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
      <h3 className="text-base font-bold text-white">Categorías</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Ayudan a los clientes a filtrar por tipo de comida
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-gray-500">No hay categorías creadas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => {
            const activa = seleccionadas.includes(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activa
                    ? 'bg-brand text-black border-brand'
                    : 'bg-surface-dark text-gray-300 border-line-light hover:border-brand'
                }`}
              >
                {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                {cat.nombre}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
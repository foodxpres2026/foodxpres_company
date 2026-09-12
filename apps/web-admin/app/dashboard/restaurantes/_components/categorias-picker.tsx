'use client'

import { useEffect, useState } from 'react'

interface Categoria {
  id: string
  slug: string
  nombre: string
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
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900">
        Categorías
      </h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Ayudan a los clientes a filtrar por tipo de comida
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-gray-400">
          No hay categorías creadas. Agrégalas en el SQL Editor.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => {
            const activa = seleccionadas.includes(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activa
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {cat.nombre}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
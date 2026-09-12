'use client'

import { useEffect, useState } from 'react'

interface Tag {
  id: string
  texto: string
}

export default function TagsPicker({
  seleccionados,
  onChange,
}: {
  seleccionados: string[]
  onChange: (ids: string[]) => void
}) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()
      if (data.ok) setTags(data.data)
    } finally {
      setLoading(false)
    }
  }

  async function crearTag(e: React.FormEvent) {
    e.preventDefault()
    const texto = nuevo.trim()
    if (!texto) return

    setCreando(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const data = await res.json()
      if (data.ok) {
        // Agregar a la lista si no existe
        setTags((prev) =>
          prev.some((t) => t.id === data.data.id)
            ? prev
            : [...prev, data.data].sort((a, b) =>
                a.texto.localeCompare(b.texto)
              )
        )
        // Seleccionarlo automáticamente
        onChange([...seleccionados, data.data.id])
        setNuevo('')
      }
    } finally {
      setCreando(false)
    }
  }

  function toggle(id: string) {
    if (seleccionados.includes(id)) {
      onChange(seleccionados.filter((x) => x !== id))
    } else {
      onChange([...seleccionados, id])
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900">Etiquetas</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Ej: "Favorito del barrio", "Top rated", "Nuevo"
      </p>

      {/* Chips existentes */}
      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.length === 0 && (
            <p className="text-sm text-gray-400">
              Aún no hay etiquetas. Crea la primera abajo.
            </p>
          )}
          {tags.map((tag) => {
            const activo = seleccionados.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activo
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                }`}
              >
                {tag.texto}
              </button>
            )
          })}
        </div>
      )}

      {/* Crear nueva */}
      <form onSubmit={crearTag} className="flex gap-2">
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nueva etiqueta..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
        />
        <button
          type="submit"
          disabled={creando || !nuevo.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {creando ? '...' : 'Crear'}
        </button>
      </form>
    </div>
  )
}
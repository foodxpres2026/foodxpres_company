'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Subcategoria {
  id: string
  nombre: string
  orden: number
}

export default function SubcategoriasEditor({
  restauranteId,
  initialData,
}: {
  restauranteId: string
  initialData: Subcategoria[]
}) {
  const router = useRouter()
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>(initialData)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditando, setNombreEditando] = useState('')

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(
        `/api/restaurantes/${restauranteId}/subcategorias`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre }),
        }
      )
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al crear')
        setLoading(false)
        return
      }

      setSubcategorias([...subcategorias, data.data])
      setNuevoNombre('')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function renombrar(id: string) {
    const nombre = nombreEditando.trim()
    if (!nombre) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/subcategorias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al actualizar')
        setLoading(false)
        return
      }

      setSubcategorias(
        subcategorias.map((s) => (s.id === id ? { ...s, nombre } : s))
      )
      setEditando(null)
      setNombreEditando('')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function eliminar(id: string, nombre: string) {
    if (
      !confirm(
        `¿Eliminar la subcategoría "${nombre}"? Los platos asignados quedarán sin categoría.`
      )
    )
      return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/subcategorias/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al eliminar')
        setLoading(false)
        return
      }

      setSubcategorias(subcategorias.filter((s) => s.id !== id))
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* CREAR */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
        <h3 className="text-base font-bold text-white mb-1">
          Nueva subcategoría
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Ej: Chaufas, Bebidas, Entradas, Postres...
        </p>

        <form onSubmit={agregar} className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre de la subcategoría"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={loading || !nuevoNombre.trim()}
            className="bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold px-6 py-3 rounded-xl transition-colors active:scale-[0.98]"
          >
            {loading ? '...' : '+ Agregar'}
          </button>
        </form>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm mt-3">
            {error}
          </div>
        )}
      </div>

      {/* LISTA */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {subcategorias.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-2">📂</p>
            <p className="text-gray-400 text-sm">
              Aún no hay subcategorías
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Agrega la primera usando el formulario de arriba
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {subcategorias.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors"
              >
                {editando === sub.id ? (
                  <>
                    <input
                      type="text"
                      value={nombreEditando}
                      onChange={(e) => setNombreEditando(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renombrar(sub.id)
                        if (e.key === 'Escape') {
                          setEditando(null)
                          setNombreEditando('')
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-surface-dark border border-brand rounded-lg text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => renombrar(sub.id)}
                      disabled={loading}
                      className="text-xs text-brand font-bold hover:underline"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(null)
                        setNombreEditando('')
                      }}
                      className="text-xs text-gray-500 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-lg">📂</span>
                    <span className="flex-1 text-sm text-white font-medium">
                      {sub.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(sub.id)
                        setNombreEditando(sub.nombre)
                      }}
                      className="text-xs text-gray-400 hover:text-brand transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(sub.id, sub.nombre)}
                      disabled={loading}
                      className="text-xs text-gray-400 hover:text-danger transition-colors"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
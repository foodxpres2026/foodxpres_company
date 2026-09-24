'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Categoria {
  id: string
  slug: string
  nombre: string
  emoji: string | null
  orden: number
  num_restaurantes: number
}

export default function CategoriasEditor({
  initialData,
}: {
  initialData: Categoria[]
}) {
  const router = useRouter()
  const [categorias, setCategorias] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Partial<Categoria> | null>(null)

  const [form, setForm] = useState({
    slug: '',
    nombre: '',
    emoji: '',
    orden: 0,
  })

  function abrirNueva() {
    setEditando(null)
    setForm({ slug: '', nombre: '', emoji: '', orden: categorias.length })
    setError(null)
    setModalOpen(true)
  }

  function abrirEditar(c: Categoria) {
    setEditando(c)
    setForm({
      slug: c.slug,
      nombre: c.nombre,
      emoji: c.emoji || '',
      orden: c.orden,
    })
    setError(null)
    setModalOpen(true)
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const isEdit = !!editando?.id
      const url = isEdit
        ? `/api/categorias/${editando!.id}`
        : '/api/categorias'

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al guardar')
        return
      }

      setModalOpen(false)
      router.refresh()
      window.location.reload()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function eliminar(c: Categoria) {
    if (c.num_restaurantes > 0) {
      alert(`No se puede eliminar: ${c.num_restaurantes} restaurante(s) la usan`)
      return
    }
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/categorias/${c.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.ok) {
        setCategorias(categorias.filter((x) => x.id !== c.id))
      } else {
        alert(data.error || 'Error al eliminar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={abrirNueva}
          className="bg-brand hover:bg-brand-dark text-black font-bold text-sm px-5 py-3 rounded-xl transition-colors active:scale-[0.98]"
        >
          + Nueva categoría
        </button>
      </div>

      {categorias.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-gray-400">No hay categorías</p>
          <button
            type="button"
            onClick={abrirNueva}
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Crear la primera →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categorias.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-line rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center text-2xl flex-shrink-0">
                  {c.emoji || '🍽️'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{c.nombre}</h3>
                  <p className="text-xs text-gray-500 truncate">
                    slug: {c.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-500">
                  {c.num_restaurantes} restaurante
                  {c.num_restaurantes === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    className="text-brand hover:underline font-medium"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(c)}
                    disabled={loading}
                    className="text-danger hover:underline font-medium disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-surface border border-line w-full md:max-w-md md:rounded-3xl rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={guardar} className="p-5 md:p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">
                  {editando?.id ? 'Editar categoría' : 'Nueva categoría'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-gray-500 hover:text-white text-xl p-1"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Nombre <span className="text-brand">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      nombre: v,
                      slug:
                        !editando?.id && (!prev.slug || prev.slug === slugify(prev.nombre))
                          ? slugify(v)
                          : prev.slug,
                    }))
                  }}
                  required
                  autoFocus
                  placeholder="Ej: Alitas"
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Slug <span className="text-brand">*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                  disabled={!!editando?.id}
                  placeholder="alitas"
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, emoji: e.target.value }))
                    }
                    placeholder="🍗"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand text-center text-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                    Orden
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.orden}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        orden: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={loading}
                  className="bg-surface-light hover:bg-[#222] text-gray-300 font-medium px-5 py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
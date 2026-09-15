'use client'

import { useEffect, useState } from 'react'

export interface PlatoFormData {
  id?: string
  nombre: string
  descripcion: string
  precio: number
  imagen_url: string
  tiempo_estimado: string
  disponible: boolean
  subcategoria_id: string | null
}

interface Subcategoria {
  id: string
  nombre: string
}

export default function PlatoModal({
  open,
  onClose,
  onSave,
  initialData,
  subcategorias,
  loading,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: PlatoFormData) => void | Promise<void>
  initialData?: Partial<PlatoFormData>
  subcategorias: Subcategoria[]
  loading: boolean
}) {
  const [form, setForm] = useState<PlatoFormData>({
    id: initialData?.id,
    nombre: initialData?.nombre ?? '',
    descripcion: initialData?.descripcion ?? '',
    precio: initialData?.precio ?? 0,
    imagen_url: initialData?.imagen_url ?? '',
    tiempo_estimado: initialData?.tiempo_estimado ?? '',
    disponible: initialData?.disponible ?? true,
    subcategoria_id: initialData?.subcategoria_id ?? null,
  })
  const [error, setError] = useState<string | null>(null)

  // Resetear el form cuando cambia el initialData (nuevo plato vs editar)
  useEffect(() => {
    if (open) {
      setForm({
        id: initialData?.id,
        nombre: initialData?.nombre ?? '',
        descripcion: initialData?.descripcion ?? '',
        precio: initialData?.precio ?? 0,
        imagen_url: initialData?.imagen_url ?? '',
        tiempo_estimado: initialData?.tiempo_estimado ?? '',
        disponible: initialData?.disponible ?? true,
        subcategoria_id: initialData?.subcategoria_id ?? null,
      })
      setError(null)
    }
  }, [open, initialData])

  if (!open) return null

  function update<K extends keyof PlatoFormData>(
    key: K,
    value: PlatoFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || form.precio < 0) {
      setError('Nombre y precio son obligatorios')
      return
    }
    await onSave(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">
              {initialData?.id ? 'Editar plato' : 'Nuevo plato'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-white text-xl leading-none p-1"
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
              onChange={(e) => update('nombre', e.target.value)}
              required
              autoFocus
              placeholder="Hamburguesa Clásica"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => update('descripcion', e.target.value)}
              rows={2}
              placeholder="Carne 150g, queso cheddar, lechuga, tomate..."
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Precio (S/) <span className="text-brand">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => update('precio', Number(e.target.value) || 0)}
                required
                placeholder="18.00"
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Tiempo (min)
              </label>
              <input
                type="number"
                min="0"
                value={form.tiempo_estimado}
                onChange={(e) => update('tiempo_estimado', e.target.value)}
                placeholder="15"
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Subcategoría
            </label>
            <select
              value={form.subcategoria_id ?? ''}
              onChange={(e) =>
                update('subcategoria_id', e.target.value || null)
              }
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Sin categoría</option>
              {subcategorias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              URL de imagen
            </label>
            <input
              type="url"
              value={form.imagen_url}
              onChange={(e) => update('imagen_url', e.target.value)}
              placeholder="https://ejemplo.com/plato.jpg"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="disponible"
              checked={form.disponible}
              onChange={(e) => update('disponible', e.target.checked)}
              className="w-5 h-5 rounded border-gray-700 accent-brand focus:ring-brand"
            />
            <label htmlFor="disponible" className="text-sm text-gray-300">
              Disponible para pedir
            </label>
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
              className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-3 rounded-xl transition-colors active:scale-[0.98]"
            >
              {loading
                ? 'Guardando...'
                : initialData?.id
                ? 'Guardar cambios'
                : 'Crear plato'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="bg-surface-light hover:bg-[#222] text-gray-300 font-medium px-5 py-3 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
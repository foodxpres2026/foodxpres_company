'use client'

import { useEffect, useState } from 'react'
import ImageUploader from '@/components/ui/image-uploader'

export interface PromoFormData {
  id?: string
  badge: string
  titulo: string
  subtitulo: string
  descripcion: string
  cta_texto: string
  imagen_url: string
  gradiente_css: string
  orden: number
  activo: boolean
}

export default function PromoModal({
  open,
  onClose,
  onSave,
  initialData,
  loading,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: PromoFormData) => void | Promise<void>
  initialData?: Partial<PromoFormData>
  loading: boolean
}) {
  const empty = (): PromoFormData => ({
    id: undefined,
    badge: '',
    titulo: '',
    subtitulo: '',
    descripcion: '',
    cta_texto: 'Pedir ahora',
    imagen_url: '',
    gradiente_css: '',
    orden: 0,
    activo: true,
  })

  const [form, setForm] = useState<PromoFormData>(
    initialData ? ({ ...empty(), ...initialData } as PromoFormData) : empty()
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        initialData ? ({ ...empty(), ...initialData } as PromoFormData) : empty()
      )
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData])

  if (!open) return null

  function update<K extends keyof PromoFormData>(
    key: K,
    value: PromoFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setError('El título es obligatorio')
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
              {initialData?.id ? 'Editar promoción' : 'Nueva promoción'}
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
              Título <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => update('titulo', e.target.value)}
              required
              autoFocus
              placeholder="Combo Tigre 🐯"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Badge (etiqueta superior)
            </label>
            <input
              type="text"
              value={form.badge}
              onChange={(e) => update('badge', e.target.value)}
              placeholder="TIEMPO LIMITADO · 2X1 · ENVÍO GRATIS"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Subtítulo
            </label>
            <input
              type="text"
              value={form.subtitulo}
              onChange={(e) => update('subtitulo', e.target.value)}
              placeholder="Hamburguesa doble + papas + bebida"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
            />
          </div>

          <ImageUploader
            label="Imagen del banner"
            value={form.imagen_url}
            onChange={(v) => update('imagen_url', v)}
            carpeta="promociones"
          />

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Gradiente CSS (alternativa a imagen)
            </label>
            <input
              type="text"
              value={form.gradiente_css}
              onChange={(e) => update('gradiente_css', e.target.value)}
              placeholder="linear-gradient(135deg, #7ED321, #4A9A2C)"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Orden
              </label>
              <input
                type="number"
                min="0"
                value={form.orden}
                onChange={(e) => update('orden', Number(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                CTA
              </label>
              <input
                type="text"
                value={form.cta_texto}
                onChange={(e) => update('cta_texto', e.target.value)}
                placeholder="Pedir ahora"
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => update('activo', e.target.checked)}
              className="w-5 h-5 accent-brand"
            />
            <span className="text-sm text-gray-300">
              Activo (visible en la web)
            </span>
          </label>

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
                : 'Crear promoción'}
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
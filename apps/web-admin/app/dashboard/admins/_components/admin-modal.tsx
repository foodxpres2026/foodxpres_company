'use client'

import { useEffect, useState } from 'react'

export interface AdminFormData {
  id?: string
  email: string
  nombre: string
  password: string
  activo: boolean
}

export default function AdminModal({
  open,
  onClose,
  onSave,
  initialData,
  loading,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: AdminFormData) => void | Promise<void>
  initialData?: Partial<AdminFormData>
  loading: boolean
}) {
  const emptyForm = (): AdminFormData => ({
    id: undefined,
    email: '',
    nombre: '',
    password: '',
    activo: true,
  })

  const [form, setForm] = useState<AdminFormData>(
    initialData ? ({ ...emptyForm(), ...initialData } as AdminFormData) : emptyForm()
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? ({ ...emptyForm(), ...initialData } as AdminFormData)
          : emptyForm()
      )
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData])

  if (!open) return null

  function update<K extends keyof AdminFormData>(
    key: K,
    value: AdminFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isEdit = !!form.id

    if (!isEdit && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (isEdit && form.password && form.password.length < 6) {
      setError('Si cambias la contraseña, mínimo 6 caracteres')
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
        className="bg-surface border border-line w-full md:max-w-md md:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">
              {initialData?.id ? 'Editar admin' : 'Nuevo admin'}
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
              placeholder="Juan Pérez"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Email <span className="text-brand">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              placeholder="admin@foodxpres.pe"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              {initialData?.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}{' '}
              {!initialData?.id && <span className="text-brand">*</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required={!initialData?.id}
              minLength={6}
              placeholder={initialData?.id ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="activo"
              checked={form.activo}
              onChange={(e) => update('activo', e.target.checked)}
              className="w-5 h-5 accent-brand"
            />
            <label htmlFor="activo" className="text-sm text-gray-300">
              Activo
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
                : 'Crear admin'}
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
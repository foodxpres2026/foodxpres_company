'use client'

import { useEffect, useState } from 'react'

export interface DriverFormData {
  id?: string
  nombre: string
  celular: string
  password: string
  vehiculo: string
  placa: string
  licencia: string
  activo: boolean
  disponible: boolean
}

export default function DriverModal({
  open,
  onClose,
  onSave,
  initialData,
  loading,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: DriverFormData) => void | Promise<void>
  initialData?: Partial<DriverFormData>
  loading: boolean
}) {
  const emptyForm = (): DriverFormData => ({
    id: undefined,
    nombre: '',
    celular: '',
    password: '',
    vehiculo: '',
    placa: '',
    licencia: '',
    activo: true,
    disponible: true,
  })

  const [form, setForm] = useState<DriverFormData>(
    initialData ? ({ ...emptyForm(), ...initialData } as DriverFormData) : emptyForm()
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? ({ ...emptyForm(), ...initialData } as DriverFormData)
          : emptyForm()
      )
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData])

  if (!open) return null

  function update<K extends keyof DriverFormData>(
    key: K,
    value: DriverFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isEdit = !!form.id

    if (!/^9\d{8}$/.test(form.celular)) {
      setError('Celular debe ser 9 dígitos empezando con 9')
      return
    }
    if (!isEdit && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
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
              {initialData?.id ? 'Editar driver' : 'Nuevo driver'}
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
              placeholder="Carlos Repartidor"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Celular <span className="text-brand">*</span>
            </label>
            <input
              type="tel"
              value={form.celular}
              onChange={(e) =>
                update('celular', e.target.value.replace(/\D/g, '').slice(0, 9))
              }
              required
              placeholder="987654321"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {!initialData?.id && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Contraseña <span className="text-brand">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <p className="text-xs text-gray-600 mt-1">
                El driver usará esto para entrar en su app
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Vehículo
              </label>
              <input
                type="text"
                value={form.vehiculo}
                onChange={(e) => update('vehiculo', e.target.value)}
                placeholder="Moto Honda 150"
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Placa
              </label>
              <input
                type="text"
                value={form.placa}
                onChange={(e) => update('placa', e.target.value)}
                placeholder="P-123456"
                className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Licencia
            </label>
            <input
              type="text"
              value={form.licencia}
              onChange={(e) => update('licencia', e.target.value)}
              placeholder="Q12345678"
              className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-5 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => update('activo', e.target.checked)}
                className="w-5 h-5 accent-brand"
              />
              <span className="text-sm text-gray-300">Activo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.disponible}
                onChange={(e) => update('disponible', e.target.checked)}
                className="w-5 h-5 accent-brand"
              />
              <span className="text-sm text-gray-300">Disponible</span>
            </label>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-surface pt-3 -mx-5 md:-mx-6 px-5 md:px-6 pb-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-3 rounded-xl transition-colors active:scale-[0.98]"
            >
              {loading
                ? 'Guardando...'
                : initialData?.id
                ? 'Guardar cambios'
                : 'Crear driver'}
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
'use client'

import { useEffect, useState } from 'react'

export default function CambiarPasswordModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (open) {
      setActual('')
      setNueva('')
      setConfirmar('')
      setError(null)
      setLoading(false)
      setExito(false)
    }
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (!/^\d{4}$/.test(nueva)) {
      setError('La nueva contraseña debe ser un PIN de 4 dígitos')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_actual: actual,
          password_nueva: nueva,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al cambiar')
        setLoading(false)
        return
      }

      setExito(true)
      setTimeout(() => onClose(), 1500)
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line w-full md:max-w-md md:rounded-3xl rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">
              Cambiar PIN de acceso
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-white text-xl leading-none p-1"
            >
              ✕
            </button>
          </div>

          {exito ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-white font-bold">
                ¡PIN actualizado!
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Nuevo PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  autoComplete="new-password"
                  placeholder="Ingresa 4 dígitos"
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Confirmar PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  autoComplete="new-password"
                  placeholder="Repite los 4 dígitos"
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
                />
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
                  {loading ? 'Actualizando...' : 'Cambiar PIN'}
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
            </>
          )}
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EditarNombreModal({
  open,
  onClose,
  nombreActual,
}: {
  open: boolean
  onClose: () => void
  nombreActual: string
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState(nombreActual)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNombre(nombreActual)
      setError(null)
      setLoading(false)
    }
  }, [open, nombreActual])

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
    setLoading(true)

    try {
      const res = await fetch('/api/auth/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al actualizar')
        setLoading(false)
        return
      }

      onClose()
      router.refresh()
      // Recargar para actualizar el header
      window.location.reload()
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
              Editar nombre
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
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              minLength={2}
              maxLength={120}
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
              disabled={loading || nombre.trim().length < 2}
              className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar'}
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
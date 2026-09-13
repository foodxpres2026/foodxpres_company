'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AccionesFila({
  id,
  nombre,
  activo,
}: {
  id: string
  nombre: string
  activo: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggleActivo() {
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurantes/${id}/toggle-activo`, {
        method: 'PATCH',
      })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function desactivar() {
    if (!confirm(`¿Desactivar "${nombre}"? Dejará de ser visible para clientes.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurantes/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleActivo}
        disabled={loading}
        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
          activo
            ? 'bg-brand/15 text-brand hover:bg-brand/25'
            : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
        }`}
      >
        {activo ? 'Activo' : 'Inactivo'}
      </button>

      {activo && (
        <button
          type="button"
          onClick={desactivar}
          disabled={loading}
          className="text-xs text-danger hover:text-danger/80 hover:underline disabled:opacity-50"
        >
          Desactivar
        </button>
      )}
    </div>
  )
}
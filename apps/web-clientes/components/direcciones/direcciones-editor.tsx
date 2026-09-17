'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DireccionModal, { type Direccion } from './direccion-modal'

interface DireccionCompleta {
  id: string
  etiqueta: string
  direccion: string
  referencia: string | null
  lat: number
  lng: number
  es_predeterminada: boolean
}

export default function DireccionesEditor({
  initialData,
}: {
  initialData: DireccionCompleta[]
}) {
  const router = useRouter()
  const [direcciones, setDirecciones] = useState(initialData)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Partial<Direccion> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function abrirNueva() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(d: DireccionCompleta) {
    setEditando({
      id: d.id,
      etiqueta: d.etiqueta,
      direccion: d.direccion,
      referencia: d.referencia ?? '',
      lat: Number(d.lat),
      lng: Number(d.lng),
      es_predeterminada: d.es_predeterminada,
    })
    setModalOpen(true)
  }

  async function guardar(data: Direccion) {
    setError(null)
    setLoading(true)

    try {
      const isEdit = !!data.id
      const url = isEdit ? `/api/direcciones/${data.id}` : '/api/direcciones'

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etiqueta: data.etiqueta,
          direccion: data.direccion,
          referencia: data.referencia,
          lat: data.lat,
          lng: data.lng,
        }),
      })

      const resData = await res.json()

      if (!res.ok || !resData.ok) {
        setError(resData.error || 'Error al guardar')
        setLoading(false)
        return
      }

      setModalOpen(false)
      router.refresh()
      window.location.reload() // simple recarga para tener todo fresco
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  async function marcarPredeterminada(d: DireccionCompleta) {
    setLoading(true)
    try {
      await fetch('/api/direcciones/predeterminada', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direccion_id: d.id }),
      })
      setDirecciones(
        direcciones.map((x) => ({
          ...x,
          es_predeterminada: x.id === d.id,
        }))
      )
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function eliminar(d: DireccionCompleta) {
    if (!confirm(`¿Eliminar "${d.etiqueta}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/direcciones/${d.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDirecciones(direcciones.filter((x) => x.id !== d.id))
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {direcciones.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">📍</p>
          <p className="text-gray-400">Aún no tienes direcciones</p>
          <button
            type="button"
            onClick={abrirNueva}
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Agregar la primera →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {direcciones.map((d) => (
            <div
              key={d.id}
              className={`bg-surface border rounded-2xl p-4 ${
                d.es_predeterminada ? 'border-brand' : 'border-line'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-xl flex-shrink-0">
                  🏠
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white">{d.etiqueta}</span>
                    {d.es_predeterminada && (
                      <span className="text-[10px] bg-brand text-black px-2 py-0.5 rounded-full font-bold">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 truncate">
                    {d.direccion}
                  </p>
                  {d.referencia && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      Ref: {d.referencia}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line flex-wrap">
                {!d.es_predeterminada && (
                  <button
                    type="button"
                    onClick={() => marcarPredeterminada(d)}
                    disabled={loading}
                    className="text-xs text-brand hover:underline"
                  >
                    Usar como principal
                  </button>
                )}
                <span className="text-gray-700">·</span>
                <button
                  type="button"
                  onClick={() => abrirEditar(d)}
                  className="text-xs text-gray-400 hover:text-brand"
                >
                  Editar
                </button>
                <span className="text-gray-700">·</span>
                <button
                  type="button"
                  onClick={() => eliminar(d)}
                  disabled={loading}
                  className="text-xs text-gray-400 hover:text-danger"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={abrirNueva}
            className="w-full bg-surface border-2 border-dashed border-line hover:border-brand rounded-2xl p-4 text-gray-500 hover:text-brand transition-colors text-sm font-medium"
          >
            + Agregar nueva dirección
          </button>
        </div>
      )}

      <DireccionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardar={guardar}
        initialData={editando ?? undefined}
      />
    </div>
  )
}
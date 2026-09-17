'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DireccionModalWrapper from './direccion-modal-wrapper'
import { type Direccion } from './direccion-modal'
import {
  leerDireccionTemporal,
  limpiarDireccionTemporal,
  type DireccionLocal,
} from '@/hooks/use-direccion-actual'

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
  estaLogueado,
}: {
  initialData: DireccionCompleta[]
  estaLogueado: boolean
}) {
  const router = useRouter()
  const [direcciones, setDirecciones] = useState(initialData)
  const [temporal, setTemporal] = useState<DireccionLocal | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Partial<Direccion> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!estaLogueado) {
      setTemporal(leerDireccionTemporal())
    }
  }, [estaLogueado])

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

  function eliminarTemporal() {
    if (!confirm('¿Eliminar esta dirección temporal?')) return
    limpiarDireccionTemporal()
    setTemporal(null)
    router.refresh()
  }

  // ============================================
  // CLIENTE ANÓNIMO
  // ============================================
  if (!estaLogueado) {
    return (
      <div className="space-y-4">
        <div className="bg-jaguar/5 border border-jaguar/30 rounded-2xl p-4">
          <p className="text-xs text-jaguar">
            💡 Por ahora tu dirección se guarda en este dispositivo. Al
            registrarte se guardará automáticamente en tu cuenta.
          </p>
        </div>

        {temporal ? (
          <div className="bg-surface border-2 border-brand rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-xl flex-shrink-0">
                🏠
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-white">{temporal.etiqueta}</span>
                  <span className="text-[10px] bg-brand text-black px-2 py-0.5 rounded-full font-bold">
                    Actual
                  </span>
                </div>
                <p className="text-sm text-gray-300 truncate">
                  {temporal.direccion}
                </p>
                {temporal.referencia && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Ref: {temporal.referencia}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditando({
                    etiqueta: temporal.etiqueta,
                    direccion: temporal.direccion,
                    referencia: temporal.referencia,
                    lat: temporal.lat,
                    lng: temporal.lng,
                  })
                  setModalOpen(true)
                }}
                className="text-xs text-gray-400 hover:text-brand"
              >
                Editar
              </button>
              <span className="text-gray-700">·</span>
              <button
                type="button"
                onClick={eliminarTemporal}
                className="text-xs text-gray-400 hover:text-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl p-12 text-center">
            <p className="text-4xl mb-2">📍</p>
            <p className="text-gray-400">Aún no tienes una dirección</p>
            <button
              type="button"
              onClick={abrirNueva}
              className="text-brand hover:underline text-sm mt-3 inline-block"
            >
              Agregar mi dirección →
            </button>
          </div>
        )}

        <DireccionModalWrapper
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          estaLogueado={false}
          initialData={editando ?? undefined}
          onGuardada={() => setTemporal(leerDireccionTemporal())}
        />
      </div>
    )
  }

  // ============================================
  // CLIENTE LOGUEADO
  // ============================================
  return (
    <div className="space-y-4">
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

      <DireccionModalWrapper
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        estaLogueado={true}
        initialData={editando ?? undefined}
      />
    </div>
  )
}
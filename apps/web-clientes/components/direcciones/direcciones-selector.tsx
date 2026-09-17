'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DireccionModalWrapper from './direccion-modal-wrapper'
import { type Direccion } from './direccion-modal'

interface DireccionCompleta {
  id: string
  etiqueta: string
  direccion: string
  referencia: string | null
  lat: number
  lng: number
  es_predeterminada: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  estaLogueado: boolean
}

export default function DireccionesSelector({
  open,
  onClose,
  estaLogueado,
}: Props) {
  const router = useRouter()
  const [direcciones, setDirecciones] = useState<DireccionCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [modalCrearOpen, setModalCrearOpen] = useState(false)
  const [editando, setEditando] = useState<Partial<Direccion> | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/direcciones')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setDirecciones(data.data)
      })
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  async function seleccionar(d: DireccionCompleta) {
    await fetch('/api/direcciones/predeterminada', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direccion_id: d.id }),
    })
    router.refresh()
    onClose()
  }

  async function eliminar(d: DireccionCompleta) {
    if (!confirm(`¿Eliminar "${d.etiqueta}"?`)) return
    await fetch(`/api/direcciones/${d.id}`, { method: 'DELETE' })
    setDirecciones(direcciones.filter((x) => x.id !== d.id))
    router.refresh()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-surface border border-line w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 md:hidden">
            <div className="w-12 h-1 rounded-full bg-gray-700" />
          </div>

          {/* HEADER */}
          <div className="flex items-center justify-between gap-3 p-4 md:p-5 border-b border-line">
            <div>
              <h2 className="text-lg font-bold text-white">
                📍 ¿A dónde te llevamos?
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Elige una dirección o agrega una nueva
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-light hover:bg-line flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
            {loading ? (
              <p className="text-center text-gray-500 py-8 text-sm">
                Cargando direcciones...
              </p>
            ) : direcciones.length === 0 ? (
              <div className="bg-surface-dark border border-line rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">📍</p>
                <p className="text-sm text-gray-400">
                  Aún no tienes direcciones guardadas
                </p>
              </div>
            ) : (
              direcciones.map((d) => (
                <div
                  key={d.id}
                  className={`rounded-2xl border transition-all ${
                    d.es_predeterminada
                      ? 'border-brand bg-brand/5'
                      : 'border-line bg-surface-dark hover:border-brand/40'
                  }`}
                >
                  {/* Botón principal de selección */}
                  <button
                    type="button"
                    onClick={() => seleccionar(d)}
                    className="w-full flex items-start gap-3 p-4 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-xl flex-shrink-0">
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white text-sm">
                          {d.etiqueta}
                        </span>
                        {d.es_predeterminada && (
                          <span className="text-[10px] bg-brand text-black px-2 py-0.5 rounded-full font-bold">
                            ✓ Actual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {d.direccion}
                      </p>
                      {d.referencia && (
                        <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                          Ref: {d.referencia}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Acciones separadas (fuera del button principal) */}
                  <div className="flex items-center gap-3 px-4 pb-3 pt-1 border-t border-line/50">
                    <button
                      type="button"
                      onClick={() => {
                        setEditando({
                          id: d.id,
                          etiqueta: d.etiqueta,
                          direccion: d.direccion,
                          referencia: d.referencia ?? '',
                          lat: Number(d.lat),
                          lng: Number(d.lng),
                        })
                        setModalCrearOpen(true)
                      }}
                      className="text-[11px] text-gray-400 hover:text-brand transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <span className="text-gray-700">·</span>
                    <button
                      type="button"
                      onClick={() => eliminar(d)}
                      className="text-[11px] text-gray-400 hover:text-danger transition-colors"
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 md:p-5 border-t border-line bg-surface">
            <button
              type="button"
              onClick={() => {
                setEditando(null)
                setModalCrearOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-xl transition-colors active:scale-[0.98]"
            >
              <span className="text-lg">+</span>
              <span className="text-sm">Agregar nueva dirección</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PARA CREAR/EDITAR */}
      <DireccionModalWrapper
        open={modalCrearOpen}
        onClose={() => {
          setModalCrearOpen(false)
          setEditando(null)
          fetch('/api/direcciones')
            .then((r) => r.json())
            .then((data) => {
              if (data.ok) setDirecciones(data.data)
            })
          router.refresh()
        }}
        estaLogueado={estaLogueado}
        initialData={editando ?? undefined}
      />
    </>
  )
}
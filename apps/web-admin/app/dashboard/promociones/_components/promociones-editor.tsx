'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PromoModal, { type PromoFormData } from './promo-modal'

interface Promocion {
  id: string
  badge: string | null
  titulo: string
  subtitulo: string | null
  descripcion: string | null
  cta_texto: string | null
  imagen_url: string | null
  gradiente_css: string | null
  orden: number
  activo: boolean
  creado_en: string
}

export default function PromocionesEditor({
  initialData,
}: {
  initialData: Promocion[]
}) {
  const router = useRouter()
  const [promos, setPromos] = useState(initialData)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<PromoFormData> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNuevo() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEditar(p: Promocion) {
    setEditing({
      id: p.id,
      badge: p.badge ?? '',
      titulo: p.titulo,
      subtitulo: p.subtitulo ?? '',
      descripcion: p.descripcion ?? '',
      cta_texto: p.cta_texto ?? '',
      imagen_url: p.imagen_url ?? '',
      gradiente_css: p.gradiente_css ?? '',
      orden: p.orden,
      activo: p.activo,
    })
    setModalOpen(true)
  }

  async function handleSave(data: PromoFormData) {
    setError(null)
    setLoading(true)

    try {
      const isEdit = !!data.id
      const url = isEdit ? `/api/promociones/${data.id}` : '/api/promociones'
      const payload = {
        ...data,
        badge: data.badge || null,
        subtitulo: data.subtitulo || null,
        descripcion: data.descripcion || null,
        cta_texto: data.cta_texto || null,
        imagen_url: data.imagen_url || null,
        gradiente_css: data.gradiente_css || null,
      }

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const resData = await res.json()

      if (!res.ok || !resData.ok) {
        setError(resData.error || 'Error al guardar')
        setLoading(false)
        return
      }

      setModalOpen(false)
      router.refresh()

      if (isEdit) {
        setPromos(
          promos.map((p) =>
            p.id === data.id ? { ...p, ...payload, id: p.id, creado_en: p.creado_en } : p
          )
        )
      } else {
        window.location.reload()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActivo(p: Promocion) {
    setLoading(true)
    try {
      const res = await fetch(`/api/promociones/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badge: p.badge,
          titulo: p.titulo,
          subtitulo: p.subtitulo,
          descripcion: p.descripcion,
          cta_texto: p.cta_texto,
          imagen_url: p.imagen_url,
          gradiente_css: p.gradiente_css,
          orden: p.orden,
          activo: !p.activo,
        }),
      })
      if (res.ok) {
        setPromos(
          promos.map((x) => (x.id === p.id ? { ...x, activo: !x.activo } : x))
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function eliminar(p: Promocion) {
    if (!confirm(`¿Eliminar la promo "${p.titulo}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/promociones/${p.id}`, { method: 'DELETE' })
      if (res.ok) {
        setPromos(promos.filter((x) => x.id !== p.id))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openNuevo}
          className="bg-brand hover:bg-brand-dark text-black font-bold text-sm px-5 py-3 rounded-xl transition-colors active:scale-[0.98]"
        >
          + Nueva promoción
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {promos.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🎨</p>
          <p className="text-gray-400">No hay promociones creadas</p>
          <button
            type="button"
            onClick={openNuevo}
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Crear la primera →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p) => (
            <div
              key={p.id}
              className="bg-surface border border-line rounded-2xl overflow-hidden"
            >
              {/* PREVIEW */}
              <div className="relative h-40 bg-surface-dark">
                {p.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imagen_url}
                    alt={p.titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        p.gradiente_css ||
                        'linear-gradient(135deg, #7ED321, #4A9A2C)',
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />

                {p.badge && (
                  <span className="absolute top-3 left-3 bg-brand text-black text-[10px] font-bold px-2 py-1 rounded-full">
                    {p.badge}
                  </span>
                )}
                {!p.activo && (
                  <span className="absolute top-3 right-3 bg-gray-900/90 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-full">
                    Inactivo
                  </span>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm truncate">
                    {p.titulo}
                  </p>
                  {p.subtitulo && (
                    <p className="text-gray-300 text-xs truncate">
                      {p.subtitulo}
                    </p>
                  )}
                </div>
              </div>

              {/* INFO + ACCIONES */}
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">
                  Orden: {p.orden}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActivo(p)}
                    disabled={loading}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      p.activo
                        ? 'bg-brand/15 text-brand hover:bg-brand/25'
                        : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }`}
                  >
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditar(p)}
                    className="text-xs text-gray-400 hover:text-brand transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(p)}
                    disabled={loading}
                    className="text-xs text-gray-400 hover:text-danger transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editing ?? undefined}
        loading={loading}
      />
    </div>
  )
}
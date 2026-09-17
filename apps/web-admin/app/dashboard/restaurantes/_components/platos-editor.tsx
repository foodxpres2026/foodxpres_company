'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlatoModal, { type PlatoFormData } from './plato-modal'
import { type GrupoLocal } from './opciones-editor'

interface Plato {
  id: string
  nombre: string
  descripcion: string | null
  precio: string
  imagen_url: string | null
  tiempo_estimado: number | null
  disponible: boolean
  subcategoria_id: string | null
  subcategoria_nombre: string | null
  num_grupos: number
}

interface Subcategoria {
  id: string
  nombre: string
  orden: number
}

export default function PlatosEditor({
  restauranteId,
  initialPlatos,
  subcategorias,
}: {
  restauranteId: string
  initialPlatos: Plato[]
  subcategorias: Subcategoria[]
}) {
  const router = useRouter()
  const [platos, setPlatos] = useState<Plato[]>(initialPlatos)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlato, setEditingPlato] = useState<Partial<PlatoFormData> | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Agrupar por subcategoría
  const grupos = useMemo(() => {
    const gruposArr: {
      id: string | null
      nombre: string
      platos: Plato[]
    }[] = []

    for (const sub of subcategorias) {
      const platosSub = platos.filter((p) => p.subcategoria_id === sub.id)
      if (platosSub.length > 0) {
        gruposArr.push({ id: sub.id, nombre: sub.nombre, platos: platosSub })
      }
    }

    const sinCat = platos.filter((p) => !p.subcategoria_id)
    if (sinCat.length > 0) {
      gruposArr.push({ id: null, nombre: 'Sin categoría', platos: sinCat })
    }

    return gruposArr
  }, [platos, subcategorias])

  function openNuevo() {
    setEditingPlato(null)
    setModalOpen(true)
  }

  async function openEditar(p: Plato) {
    setLoading(true)
    try {
      // Cargar opciones del plato
      const res = await fetch(`/api/platos/${p.id}/opciones`)
      const data = await res.json()
      const gruposOp: GrupoLocal[] = (data.data ?? []).map((g: any) => ({
        titulo: g.titulo,
        requerido: g.requerido,
        minimo: g.minimo,
        maximo: g.maximo,
        choices: g.choices.map((c: any) => ({
          nombre: c.nombre,
          precio_extra: Number(c.precio_extra),
        })),
      }))

      setEditingPlato({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion ?? '',
        precio: Number(p.precio),
        imagen_url: p.imagen_url ?? '',
        tiempo_estimado: p.tiempo_estimado ? String(p.tiempo_estimado) : '',
        disponible: p.disponible,
        subcategoria_id: p.subcategoria_id,
        grupos: gruposOp,
      })
      setModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(data: PlatoFormData) {
    setError(null)
    setLoading(true)

    try {
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precio: data.precio,
        imagen_url: data.imagen_url || null,
        tiempo_estimado: data.tiempo_estimado
          ? Number(data.tiempo_estimado)
          : null,
        disponible: data.disponible,
        subcategoria_id: data.subcategoria_id,
      }

      const isEdit = !!data.id
      const url = isEdit
        ? `/api/platos/${data.id}`
        : `/api/restaurantes/${restauranteId}/platos`

      // 1. Guardar plato
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const resData = await res.json()

      if (!res.ok || !resData.ok) {
        setError(resData.error || 'Error al guardar plato')
        setLoading(false)
        return
      }

      const platoId = isEdit ? data.id! : resData.data.id

      // 2. Guardar opciones
      const resOpc = await fetch(`/api/platos/${platoId}/opciones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupos: data.grupos ?? [] }),
      })
      const resOpcData = await resOpc.json()

      if (!resOpc.ok || !resOpcData.ok) {
        setError('Plato guardado, pero fallaron las opciones')
        setLoading(false)
        return
      }

      setModalOpen(false)
      router.refresh()

      // Actualizar estado local
      const subNombre =
        subcategorias.find((s) => s.id === data.subcategoria_id)?.nombre ?? null

      if (isEdit) {
        setPlatos(
          platos.map((p) =>
            p.id === data.id
              ? {
                  ...p,
                  nombre: payload.nombre,
                  descripcion: payload.descripcion,
                  precio: String(payload.precio),
                  imagen_url: payload.imagen_url,
                  tiempo_estimado: payload.tiempo_estimado,
                  disponible: payload.disponible,
                  subcategoria_id: payload.subcategoria_id,
                  subcategoria_nombre: subNombre,
                  num_grupos: data.grupos?.length ?? 0,
                }
              : p
          )
        )
      } else {
        const nuevoPlato: Plato = {
          id: platoId,
          nombre: payload.nombre,
          descripcion: payload.descripcion,
          precio: String(payload.precio),
          imagen_url: payload.imagen_url,
          tiempo_estimado: payload.tiempo_estimado,
          disponible: payload.disponible,
          subcategoria_id: payload.subcategoria_id,
          subcategoria_nombre: subNombre,
          num_grupos: 0,
        }
        setPlatos([...platos, nuevoPlato])
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function toggleDisponible(p: Plato) {
    setLoading(true)
    try {
      const res = await fetch(`/api/platos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: Number(p.precio),
          imagen_url: p.imagen_url,
          tiempo_estimado: p.tiempo_estimado,
          disponible: !p.disponible,
          subcategoria_id: p.subcategoria_id,
        }),
      })
      if (res.ok) {
        setPlatos(
          platos.map((x) =>
            x.id === p.id ? { ...x, disponible: !x.disponible } : x
          )
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function eliminar(p: Plato) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`))
      return
    setLoading(true)
    try {
      const res = await fetch(`/api/platos/${p.id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlatos(platos.filter((x) => x.id !== p.id))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div>
          <p className="text-sm text-gray-400">
            {platos.length} plato{platos.length === 1 ? '' : 's'} en el menú
          </p>
        </div>
        <button
          type="button"
          onClick={openNuevo}
          className="bg-brand hover:bg-brand-dark text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98]"
        >
          + Nuevo plato
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {platos.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-gray-400">El menú está vacío</p>
          <button
            type="button"
            onClick={openNuevo}
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Agregar el primer plato →
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <div key={grupo.id ?? 'sin-cat'}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {grupo.nombre} · {grupo.platos.length}
              </h3>
              <div className="bg-surface border border-line rounded-2xl overflow-hidden divide-y divide-line">
                {grupo.platos.map((p) => (
                  <div
                    key={p.id}
                    className="flex gap-3 p-3 md:p-4 hover:bg-surface-light transition-colors"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-surface-dark border border-line flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {p.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl opacity-30">🍽️</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm md:text-base truncate flex-1">
                          {p.nombre}
                        </h4>
                        {p.num_grupos > 0 && (
                          <span
                            className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                            title={`${p.num_grupos} grupo${
                              p.num_grupos === 1 ? '' : 's'
                            } de opciones`}
                          >
                            ⚙️ {p.num_grupos}
                          </span>
                        )}
                        {!p.disponible && (
                          <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            No disponible
                          </span>
                        )}
                      </div>
                      {p.descripcion && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                          {p.descripcion}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-brand">
                          S/ {Number(p.precio).toFixed(2)}
                        </span>
                        {p.tiempo_estimado && (
                          <span className="text-gray-500">
                            ⏱ {p.tiempo_estimado} min
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 mt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openEditar(p)}
                          className="text-gray-400 hover:text-brand transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDisponible(p)}
                          disabled={loading}
                          className="text-gray-400 hover:text-yellow-400 transition-colors"
                        >
                          {p.disponible ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(p)}
                          disabled={loading}
                          className="text-gray-400 hover:text-danger transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PlatoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingPlato ?? undefined}
        subcategorias={subcategorias}
        loading={loading}
      />
    </div>
  )
}
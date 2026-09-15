'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DriverModal, { type DriverFormData } from './driver-modal'

interface Driver {
  id: string
  nombre: string
  celular: string
  activo: boolean
  creado_en: string
  vehiculo: string | null
  placa: string | null
  licencia: string | null
  disponible: boolean | null
  total_entregas: number
  pedidos_activos: number
}

export default function DriversEditor({
  initialDrivers,
}: {
  initialDrivers: Driver[]
}) {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<DriverFormData> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNuevo() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEditar(d: Driver) {
    setEditing({
      id: d.id,
      nombre: d.nombre,
      celular: d.celular,
      vehiculo: d.vehiculo ?? '',
      placa: d.placa ?? '',
      licencia: d.licencia ?? '',
      activo: d.activo,
      disponible: d.disponible ?? true,
    })
    setModalOpen(true)
  }

  async function handleSave(data: DriverFormData) {
    setError(null)
    setLoading(true)

    try {
      const isEdit = !!data.id
      const url = isEdit ? `/api/drivers/${data.id}` : '/api/drivers'

      const payload: any = {
        nombre: data.nombre,
        celular: data.celular,
        vehiculo: data.vehiculo || null,
        placa: data.placa || null,
        licencia: data.licencia || null,
        activo: data.activo,
        disponible: data.disponible,
      }

      if (!isEdit && data.password) {
        payload.password = data.password
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
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function desactivar(d: Driver) {
    if (
      !confirm(
        `¿Desactivar a "${d.nombre}"? Ya no podrá tomar pedidos hasta reactivarlo.`
      )
    )
      return
    setLoading(true)
    try {
      const res = await fetch(`/api/drivers/${d.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDrivers(
          drivers.map((x) => (x.id === d.id ? { ...x, activo: false } : x))
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function reactivar(d: Driver) {
    setLoading(true)
    try {
      const res = await fetch(`/api/drivers/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: d.nombre,
          celular: d.celular,
          vehiculo: d.vehiculo,
          placa: d.placa,
          licencia: d.licencia,
          activo: true,
          disponible: true,
        }),
      })
      if (res.ok) {
        setDrivers(
          drivers.map((x) => (x.id === d.id ? { ...x, activo: true } : x))
        )
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
          + Nuevo driver
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {drivers.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🏍️</p>
          <p className="text-gray-400">No hay drivers registrados</p>
          <button
            type="button"
            onClick={openNuevo}
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Crear el primero →
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <ul className="divide-y divide-line">
            {drivers.map((d) => (
              <li
                key={d.id}
                className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-4 hover:bg-surface-light transition-colors"
              >
                {/* AVATAR */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${
                      d.activo
                        ? 'bg-brand/20 text-brand'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {d.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {d.nombre}
                    </p>
                    <p className="text-xs text-gray-500">📱 {d.celular}</p>
                  </div>
                </div>

                {/* INFO */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-xs md:w-auto">
                  {d.vehiculo && (
                    <div className="text-gray-400">
                      🏍️ {d.vehiculo}
                      {d.placa && (
                        <span className="text-gray-600"> · {d.placa}</span>
                      )}
                    </div>
                  )}
                  <div className="text-gray-400">
                    📦 {d.total_entregas} entregas
                  </div>
                  {d.pedidos_activos > 0 && (
                    <div className="text-yellow-400">
                      🔥 {d.pedidos_activos} activo
                      {d.pedidos_activos === 1 ? '' : 's'}
                    </div>
                  )}
                </div>

                {/* ESTADO */}
                <div className="flex items-center gap-2 md:flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.activo
                        ? d.disponible
                          ? 'bg-brand/15 text-brand'
                          : 'bg-yellow-500/15 text-yellow-400'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {!d.activo
                      ? 'Inactivo'
                      : d.disponible
                      ? 'Disponible'
                      : 'Ocupado'}
                  </span>
                </div>

                {/* ACCIONES */}
                <div className="flex items-center gap-3 md:flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditar(d)}
                    className="text-xs text-gray-400 hover:text-brand transition-colors"
                  >
                    Editar
                  </button>
                  {d.activo ? (
                    <button
                      type="button"
                      onClick={() => desactivar(d)}
                      disabled={loading}
                      className="text-xs text-gray-400 hover:text-danger transition-colors"
                    >
                      Desactivar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reactivar(d)}
                      disabled={loading}
                      className="text-xs text-gray-400 hover:text-brand transition-colors"
                    >
                      Reactivar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DriverModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editing ?? undefined}
        loading={loading}
      />
    </div>
  )
}
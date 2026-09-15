'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminModal, { type AdminFormData } from './admin-modal'

interface Admin {
  id: string
  email: string
  nombre: string
  activo: boolean
  creado_en: string
}

export default function AdminsEditor({
  initialAdmins,
}: {
  initialAdmins: Admin[]
}) {
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<AdminFormData> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNuevo() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEditar(a: Admin) {
    setEditing({
      id: a.id,
      email: a.email,
      nombre: a.nombre,
      password: '',
      activo: a.activo,
    })
    setModalOpen(true)
  }

  async function handleSave(data: AdminFormData) {
    setError(null)
    setLoading(true)

    try {
      const isEdit = !!data.id
      const url = isEdit ? `/api/admins/${data.id}` : '/api/admins'
      const payload: any = {
        email: data.email,
        nombre: data.nombre,
        activo: data.activo,
      }
      if (data.password) payload.password = data.password

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
      // Cerrar el modal y actualizar localmente
      if (isEdit) {
        setAdmins(
          admins.map((a) =>
            a.id === data.id
              ? { ...a, email: data.email, nombre: data.nombre, activo: data.activo }
              : a
          )
        )
      } else {
        setAdmins([...admins, { ...resData.data }])
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function desactivar(a: Admin) {
    if (!confirm(`¿Desactivar a "${a.nombre}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admins/${a.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.ok) {
        setAdmins(admins.map((x) => (x.id === a.id ? { ...x, activo: false } : x)))
      } else {
        setError(data.error || 'Error al desactivar')
      }
    } finally {
      setLoading(false)
    }
  }

  async function reactivar(a: Admin) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admins/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: a.email,
          nombre: a.nombre,
          activo: true,
        }),
      })
      if (res.ok) {
        setAdmins(admins.map((x) => (x.id === a.id ? { ...x, activo: true } : x)))
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
          + Nuevo admin
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <ul className="divide-y divide-line">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-4 hover:bg-surface-light transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${
                    a.activo
                      ? 'bg-brand/20 text-brand'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {a.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{a.nombre}</p>
                  <p className="text-xs text-gray-500">✉️ {a.email}</p>
                </div>
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                  a.activo
                    ? 'bg-brand/15 text-brand'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {a.activo ? 'Activo' : 'Inactivo'}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEditar(a)}
                  className="text-xs text-gray-400 hover:text-brand transition-colors"
                >
                  Editar
                </button>
                {a.activo ? (
                  <button
                    type="button"
                    onClick={() => desactivar(a)}
                    disabled={loading}
                    className="text-xs text-gray-400 hover:text-danger transition-colors"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reactivar(a)}
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

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editing ?? undefined}
        loading={loading}
      />
    </div>
  )
}
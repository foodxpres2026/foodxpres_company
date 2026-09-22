'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EditarNombreModal from './editar-nombre-modal'
import CambiarPasswordModal from './cambiar-password-modal'

interface Props {
  user: {
    nombre: string
    celular: string
  }
}

export default function PerfilCliente({ user }: Props) {
  const router = useRouter()
  const [modalNombre, setModalNombre] = useState(false)
  const [modalPassword, setModalPassword] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  async function logout() {
    if (!confirm('¿Cerrar sesión?')) return
    setCerrando(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const inicial = user.nombre.charAt(0).toUpperCase()

  return (
    <div className="space-y-4">
      {/* CARD PRINCIPAL */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-brand/20 flex items-center justify-center text-brand font-black text-2xl md:text-3xl flex-shrink-0">
            {inicial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-white truncate">
              {user.nombre}
            </h2>
            <p className="text-sm text-gray-500">📱 +51 {user.celular}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalNombre(true)}
          className="w-full mt-4 bg-surface-light hover:bg-[#222] text-gray-300 font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          ✏️ Editar nombre
        </button>
      </div>
      
      {/* NOTIFICACIONES */}

      {/* OPCIONES */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <Link
          href="/direcciones"
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-light transition-colors border-b border-line"
        >
          <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-lg flex-shrink-0">
            📍
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">
              Mis direcciones
            </p>
            <p className="text-xs text-gray-500">
              Gestiona tus ubicaciones de entrega
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </Link>

        <Link
          href="/mis-pedidos"
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-light transition-colors border-b border-line"
        >
          <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-lg flex-shrink-0">
            📦
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">
              Mis pedidos
            </p>
            <p className="text-xs text-gray-500">
              Historial y seguimiento
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </Link>

        <button
          type="button"
          onClick={() => setModalPassword(true)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-light transition-colors text-left border-b border-line"
        >
          <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center text-lg flex-shrink-0">
            🔒
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">
              Cambiar contraseña
            </p>
            <p className="text-xs text-gray-500">
              Actualiza tu contraseña
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        <button
          type="button"
          onClick={logout}
          disabled={cerrando}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-danger/5 transition-colors text-left disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center text-lg flex-shrink-0">
            🚪
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-danger text-sm">
              {cerrando ? 'Cerrando...' : 'Cerrar sesión'}
            </p>
          </div>
        </button>
      </div>

      {/* INFO EXTRA */}
      <p className="text-center text-xs text-gray-700 pt-2">
        FoodXpres 🐯 · Hecho en Pucallpa
      </p>

      {/* MODALES */}
      <EditarNombreModal
        open={modalNombre}
        onClose={() => setModalNombre(false)}
        nombreActual={user.nombre}
      />

      <CambiarPasswordModal
        open={modalPassword}
        onClose={() => setModalPassword(false)}
      />
    </div>
  )
}
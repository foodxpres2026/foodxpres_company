'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UserMenu({
  nombre,
  celular,
}: {
  nombre: string
  celular: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar al click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function logout() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    setOpen(false)
    router.refresh()
    router.push('/')
  }

  const inicial = nombre.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-brand/20 hover:bg-brand/30 flex items-center justify-center text-brand font-bold transition-colors"
      >
        {inicial}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* Info del usuario */}
          <div className="p-4 border-b border-line">
            <p className="text-sm font-bold text-white truncate">{nombre}</p>
            <p className="text-xs text-gray-500">+51 {celular}</p>
          </div>

          {/* Links */}
          <div className="p-2">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-surface-light transition-colors"
            >
              <span>👤</span>
              <span>Mi perfil</span>
            </Link>
            <Link
              href="/mis-pedidos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-surface-light transition-colors"
            >
              <span>📦</span>
              <span>Mis pedidos</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-line">
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
            >
              <span>🚪</span>
              <span>{loading ? 'Cerrando...' : 'Cerrar sesión'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
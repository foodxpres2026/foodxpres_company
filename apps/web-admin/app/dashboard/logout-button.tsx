'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title="Cerrar sesión"
      className="text-xs bg-surface-light hover:bg-danger/20 hover:text-danger text-gray-400 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Salir'}
    </button>
  )
}
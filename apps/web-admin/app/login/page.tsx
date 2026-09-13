'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al iniciar sesión')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#7ED321]/10 mb-4">
            <span className="text-4xl">🐯</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            FOOD<span className="text-[#7ED321]">X</span>PRES
          </h1>
          <p className="text-gray-500 text-sm mt-1">Panel de Administración</p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#151515] border border-[#222] rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#7ED321] focus:ring-2 focus:ring-[#7ED321]/20 transition-colors"
              placeholder="admin@foodxpres.pe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#7ED321] focus:ring-2 focus:ring-[#7ED321]/20 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7ED321] hover:bg-[#6BB81A] disabled:bg-[#7ED321]/40 text-black font-bold py-3 rounded-xl transition-colors active:scale-[0.98]"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          FoodXpres © {new Date().getFullYear()} · Pucallpa
        </p>
      </div>
    </div>
  )
}
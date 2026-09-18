'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/layout/logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [celular, setCelular] = useState('')
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
        body: JSON.stringify({ celular, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al iniciar sesión')
        setLoading(false)
        return
      }

      router.push(redirect)
      router.refresh()
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark">
      {/* HEADER CON LOGO */}
      <header className="p-5">
        <Logo size={44} linkeado />
      </header>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center px-5 pb-10">
        <div className="w-full max-w-md">
          {/* LOGO GRANDE */}
          <div className="flex justify-center mb-6">
            <Logo size={96} />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white">
              Bienvenido de vuelta 👋
            </h1>
            <p className="text-gray-500 mt-2">
              Ingresa con tu celular para continuar
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-line rounded-2xl p-6 space-y-5"
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                Celular
              </label>
              <div className="flex items-center bg-surface-dark border border-line-light rounded-xl focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
                <span className="pl-4 pr-2 text-gray-500 font-medium">
                  +51
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={celular}
                  onChange={(e) =>
                    setCelular(e.target.value.replace(/\D/g, '').slice(0, 9))
                  }
                  required
                  autoComplete="tel"
                  placeholder="999 999 999"
                  className="flex-1 bg-transparent py-4 pr-4 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-4 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
              <div className="text-right mt-2">
                <Link
                  href="/recuperar"
                  className="text-xs text-brand hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link
              href={`/registro?redirect=${encodeURIComponent(redirect)}`}
              className="text-brand hover:underline font-medium"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-dark" />}>
      <LoginForm />
    </Suspense>
  )
}
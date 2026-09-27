'use client'

import { FormEvent, useState } from 'react'

export default function LoginPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) { setError(data.error ?? 'No se pudo iniciar sesión'); return }
      window.location.reload()
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  return (
    <main className="login-shell">
      <div className="login-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo.png" alt="FoodXpres" />
        <header className="heading">
          <h1>Acceso para locales</h1>
          <p>Ingresa con tu cuenta de local</p>
        </header>
        <section className="card" aria-live="polite">
          <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="local-email">Email</label>
                <input id="local-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="local@foodxpres.pe" required maxLength={254} />
              </div>
              <div className="field">
                <label htmlFor="local-password">Contraseña</label>
                <input id="local-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" required maxLength={72} />
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="submit" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
          </form>
        </section>
        <p className="footer">FoodXpres © {new Date().getFullYear()} · Pucallpa</p>
      </div>
    </main>
  )
}

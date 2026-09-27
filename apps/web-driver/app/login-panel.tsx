'use client'

import { FormEvent, useEffect, useState } from 'react'

type User = { nombre: string; celular: string }

export default function LoginPanel() {
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.ok) setUser(data.user) })
      .catch(() => {})
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular, password }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) { setError(data.error ?? 'No se pudo iniciar sesión'); return }
      setUser(data.user); setPassword('')
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  async function logout() {
    setLoading(true)
    try { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null) }
    finally { setLoading(false) }
  }

  return (
    <main className="login-shell">
      <div className="login-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo.png" alt="FoodXpres" />
        <header className="heading">
          <h1>Acceso para drivers</h1>
          <p>Ingresa con tu cuenta de repartidor</p>
        </header>
        <section className="card" aria-live="polite">
          {checking ? <p className="heading">Verificando sesión...</p> : user ? (
            <div className="success">
              <p>Sesión iniciada como <strong>{user.nombre}</strong><br />{user.celular}</p>
              <button className="logout" type="button" disabled={loading} onClick={logout}>Cerrar sesión</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="driver-phone">Celular</label>
                <input id="driver-phone" type="tel" inputMode="numeric" autoComplete="username" value={celular} onChange={(event) => setCelular(event.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="9XXXXXXXX" required pattern="9[0-9]{8}" maxLength={9} />
              </div>
              <div className="field">
                <label htmlFor="driver-password">Contraseña</label>
                <input id="driver-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" required maxLength={72} />
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="submit" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
            </form>
          )}
        </section>
        <p className="footer">FoodXpres © {new Date().getFullYear()} · Pucallpa</p>
      </div>
    </main>
  )
}

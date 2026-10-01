'use client'

import { useState } from 'react'

export default function CuentaLocalForm({
  restauranteId,
  emailInicial,
}: {
  restauranteId: string
  emailInicial: string
}) {
  const [email, setEmail] = useState(emailInicial)
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [credencial, setCredencial] = useState<{ email: string; password: string } | null>(null)

  function generarPassword() {
    const bytes = new Uint8Array(12)
    crypto.getRandomValues(bytes)
    const aleatorio = Array.from(bytes, (byte) => (byte % 36).toString(36)).join('')
    setPassword(`Fx${aleatorio}9!`)
    setMensaje('Contraseña generada. Al guardarla podrás copiarla; luego no se podrá consultar de nuevo.')
    setCredencial(null)
    setError('')
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')
    setCredencial(null)

    try {
      const response = await fetch(`/api/restaurantes/${restauranteId}/cuenta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data.error || 'No se pudo guardar la cuenta')
        return
      }
      setEmail(data.email)
      setCredencial({ email: data.email, password })
      setPassword('')
      setMensaje('Cuenta guardada. Copia estas credenciales y entrégaselas al local.')
    } catch {
      setError('Error de conexión al guardar la cuenta')
    } finally {
      setGuardando(false)
    }
  }

  async function copiarCredenciales() {
    if (!credencial) return
    try {
      await navigator.clipboard.writeText(`Correo: ${credencial.email}\nContraseña: ${credencial.password}`)
      setMensaje('Credenciales copiadas. Guárdalas de forma segura y compártelas con el local.')
    } catch {
      setError('No se pudieron copiar. Puedes copiarlas manualmente desde el recuadro.')
    }
  }

  return (
    <section className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold text-white">Acceso del local</h3>
        <p className="text-xs text-gray-500 mt-1">
          Crea la cuenta o restablece su contraseña. Por seguridad, la contraseña anterior no se puede consultar.
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Correo de acceso</span>
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
            placeholder="local@foodxpres.pe"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Nueva contraseña</span>
          <input
            type="text"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand"
            placeholder="Mínimo 8 caracteres"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generarPassword} className="bg-surface-light hover:bg-[#222] text-gray-200 px-4 py-2.5 rounded-xl text-sm">
            Generar contraseña
          </button>
          <button type="submit" disabled={guardando} className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-xl text-sm">
            {guardando ? 'Guardando…' : emailInicial ? 'Guardar / restablecer acceso' : 'Crear acceso'}
          </button>
        </div>
      </form>

      {mensaje && <p className="text-sm text-brand">{mensaje}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {credencial && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-2">
          <p className="text-sm font-bold text-white">Credenciales nuevas</p>
          <p className="text-sm text-gray-300 break-all">Correo: <strong>{credencial.email}</strong></p>
          <p className="text-sm text-gray-300 break-all">Contraseña: <strong>{credencial.password}</strong></p>
          <button type="button" onClick={copiarCredenciales} className="text-sm font-bold text-brand underline underline-offset-2">
            Copiar credenciales
          </button>
        </div>
      )}
    </section>
  )
}

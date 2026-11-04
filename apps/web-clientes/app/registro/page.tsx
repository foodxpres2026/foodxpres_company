'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth'
import Logo from '@/components/layout/logo'

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviandoCodigo, setEnviandoCodigo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const recaptcha = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainer = useRef<HTMLDivElement>(null)

  useEffect(() => () => recaptcha.current?.clear(), [])

  function mensajeErrorFirebase(error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'auth/invalid-phone-number') return 'Revisa el número de celular.'
    if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
      return 'Se alcanzó el límite de intentos. Espera un momento antes de volver a intentar.'
    }
    if (code === 'auth/captcha-check-failed') return 'No se pudo validar el control de seguridad. Intenta otra vez.'
    if (code === 'auth/operation-not-allowed') return 'La verificación por teléfono no está habilitada en Firebase.'
    if (code === 'auth/invalid-verification-code') return 'El código ingresado no es correcto.'
    if (code === 'auth/code-expired' || code === 'auth/session-expired') {
      return 'El código venció. Solicita uno nuevo.'
    }
    return 'No se pudo completar la verificación. Intenta nuevamente.'
  }

  function validarDatosRegistro() {
    if (nombre.trim().length < 2) {
      setError('Ingresa tu nombre (mínimo 2 caracteres).')
      return false
    }
    if (!/^9\d{8}$/.test(celular)) {
      setError('El celular debe tener 9 dígitos y empezar con 9.')
      return false
    }
    if (!/^\d{4}$/.test(password)) {
      setError('El PIN debe tener exactamente 4 dígitos.')
      return false
    }
    return true
  }

  async function enviarCodigo() {
    setError(null)
    if (!validarDatosRegistro()) return

    setEnviandoCodigo(true)
    try {
      const [{ getAuth, RecaptchaVerifier, signInWithPhoneNumber }, { app }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/config'),
      ])
      const auth = getAuth(app)
      if (!recaptcha.current) {
        if (!recaptchaContainer.current) throw new Error('No se encontró el contenedor de reCAPTCHA')
        recaptcha.current = new RecaptchaVerifier(auth, recaptchaContainer.current, {
          size: 'invisible',
        })
      }

      const result = await signInWithPhoneNumber(auth, `+51${celular}`, recaptcha.current)
      setConfirmation(result)
      setCodigoEnviado(true)
    } catch (error) {
      setError(mensajeErrorFirebase(error))
      recaptcha.current?.clear()
      recaptcha.current = null
    } finally {
      setEnviandoCodigo(false)
    }
  }

  function cambiarNumero() {
    recaptcha.current?.clear()
    recaptcha.current = null
    setConfirmation(null)
    setCodigoEnviado(false)
    setCodigo('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validarDatosRegistro()) return
    if (!confirmation || !codigoEnviado) {
      setError('Primero solicita el código de verificación.')
      return
    }
    if (!/^\d{6}$/.test(codigo)) {
      setError('Ingresa el código de 6 dígitos que recibiste por SMS.')
      return
    }

    setLoading(true)

    try {
      const [{ getAuth, signOut }, { app }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/config'),
      ])
      const credential = await confirmation.confirm(codigo)
      const firebaseIdToken = await credential.user.getIdToken()

      let direccionTemporal = null
      try {
        const raw = localStorage.getItem('foodxpres-direccion-temporal')
        if (raw) direccionTemporal = JSON.parse(raw)
      } catch {}

      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          celular,
          nombre,
          password,
          firebase_id_token: firebaseIdToken,
          direccion_temporal: direccionTemporal,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        await signOut(getAuth(app))
        setError(data.error || 'Error al registrarte')
        setConfirmation(null)
        setCodigoEnviado(false)
        setCodigo('')
        setLoading(false)
        return
      }

      await signOut(getAuth(app))
      if (direccionTemporal) {
        localStorage.removeItem('foodxpres-direccion-temporal')
      }

      router.push(redirect)
      router.refresh()
    } catch (error) {
      try {
        const [{ getAuth, signOut }, { app }] = await Promise.all([
          import('firebase/auth'),
          import('@/lib/firebase/config'),
        ])
        const auth = getAuth(app)
        if (auth.currentUser) await signOut(auth)
      } catch {}
      setError(mensajeErrorFirebase(error))
      setConfirmation(null)
      setCodigoEnviado(false)
      setCodigo('')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark">
      {/* HEADER CON LOGO */}
      <header className="p-5">
        <Logo size={44} linkeado />
      </header>

      <div className="flex-1 flex items-center justify-center px-5 pb-10">
        <div className="w-full max-w-md">
          {/* LOGO GRANDE */}
          <div className="flex justify-center mb-6">
            <Logo size={96} conTexto />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white">
              Crea tu cuenta 🚀
            </h1>
            <p className="text-gray-500 mt-2">
              Verifica tu celular para crear tu cuenta
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-line rounded-2xl p-6 space-y-5"
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoComplete="name"
                placeholder="Juan Pérez"
                className="w-full px-4 py-4 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

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
                  disabled={codigoEnviado}
                  required
                  autoComplete="tel"
                  placeholder="999 999 999"
                  className="flex-1 bg-transparent py-4 pr-4 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Lo usarás para iniciar sesión
              </p>
            </div>

            {!codigoEnviado ? (
              <button
                type="button"
                onClick={enviarCodigo}
                disabled={enviandoCodigo || loading}
                className="w-full border border-brand/50 text-brand hover:bg-brand/10 disabled:opacity-50 font-semibold py-3 rounded-xl transition-all"
              >
                {enviandoCodigo ? 'Enviando código...' : 'Enviar código SMS'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-brand">Código enviado al +51 {celular}</p>
                  <button type="button" onClick={cambiarNumero} className="text-xs text-gray-400 hover:text-white underline">
                    Cambiar número
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                    Código SMS
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="6 dígitos"
                    className="w-full px-4 py-4 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={enviarCodigo}
                  disabled={enviandoCodigo || loading}
                  className="text-sm text-gray-400 hover:text-white underline disabled:opacity-50"
                >
                  {enviandoCodigo ? 'Enviando...' : 'Reenviar código'}
                </button>
              </div>
            )}
            <div ref={recaptchaContainer} />

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                PIN de acceso
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  autoComplete="new-password"
                  minLength={4}
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="4 dígitos"
                  className="w-full px-4 pr-14 py-4 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                />
                <button type="button" onClick={() => setMostrarPassword((visible) => !visible)} aria-label={mostrarPassword ? 'Ocultar PIN' : 'Mostrar PIN'} className="absolute inset-y-0 right-3 text-gray-400 hover:text-white">{mostrarPassword ? '🙈' : '👁️'}</button>
              </div>
              <p className="text-xs text-gray-600 mt-1">Usa exactamente 4 dígitos.</p>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !codigoEnviado}
              className="w-full bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? 'Verificando y creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-brand hover:underline font-medium"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-dark" />}>
      <RegistroForm />
    </Suspense>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { app, vapidKey } from '@/lib/firebase/config'

type State = 'checking' | 'ready' | 'asking' | 'active' | 'denied' | 'unsupported' | 'error'

export default function PushNotifications() {
  const [state, setState] = useState<State>('checking')
  const [message, setMessage] = useState('')

  const register = useCallback(async (askPermission: boolean) => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setState('unsupported')
        return
      }
      let permission = Notification.permission
      if (askPermission && permission !== 'granted') {
        setState('asking')
        permission = await Notification.requestPermission()
      }
      if (permission === 'denied') { setState('denied'); return }
      if (permission !== 'granted') { setState('ready'); return }

      setState('asking')
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging')
      if (!(await isSupported())) { setState('unsupported'); return }
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' })
      await registration.update().catch(() => undefined)
      await navigator.serviceWorker.ready
      const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration })
      if (!token) throw new Error('Firebase no generó un token para este navegador')
      const response = await fetch('/api/push/registrar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      if (!response.ok) throw new Error('No se pudo registrar este dispositivo')
      setState('active')
    } catch (error) {
      console.error('Error registrando push del local:', error)
      setState('error')
    }
  }, [])

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) { setState('unsupported'); return }
    if (Notification.permission === 'granted') void register(false)
    else if (Notification.permission === 'denied') setState('denied')
    else setState('ready')

    let unsubscribe: (() => void) | undefined
    void import('firebase/messaging').then(async ({ getMessaging, isSupported, onMessage }) => {
      if (await isSupported()) unsubscribe = onMessage(getMessaging(app), (payload) => {
        setMessage(`${payload.notification?.title ?? 'FoodXpres'}: ${payload.notification?.body ?? 'Tienes una actualización.'}`)
        window.setTimeout(() => setMessage(''), 8000)
      })
    }).catch(() => undefined)
    return () => unsubscribe?.()
  }, [register])

  if (state === 'unsupported') return null
  const text = state === 'active' ? 'Notificaciones activadas en este dispositivo.'
    : state === 'denied' ? 'Notificaciones bloqueadas. Permítelas desde la configuración del navegador.'
      : state === 'error' ? 'No se pudieron activar. Revisa la conexión y vuelve a intentarlo.'
        : 'Activa las alertas para enterarte cuando entre un pedido, aunque no tengas abierto el panel.'
  return <div className="push-notifications" role="status">
    <span aria-hidden="true">🔔</span><div className="push-notifications-copy"><strong>{text}</strong>{message && <p>{message}</p>}</div>
    {state !== 'active' && state !== 'denied' && <button type="button" onClick={() => void register(true)} disabled={state === 'asking'}>{state === 'asking' ? 'Activando…' : state === 'error' ? 'Reintentar' : 'Activar'}</button>}
  </div>
}

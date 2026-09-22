'use client'

import { useEffect, useState, useCallback } from 'react'
import { app, vapidKey } from './config'

type Estado =
  | 'inicial'
  | 'sin-soporte'
  | 'solicitando'
  | 'concedido'
  | 'denegado'
  | 'error'

export function useFCM(habilitado: boolean) {
  const [estado, setEstado] = useState<Estado>('inicial')
  const [token, setToken] = useState<string | null>(null)

  // Detectar soporte
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setEstado('sin-soporte')
      return
    }
    if (Notification.permission === 'granted') {
      setEstado('concedido')
    } else if (Notification.permission === 'denied') {
      setEstado('denegado')
    }
  }, [])

  const activar = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (!habilitado) return

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setEstado('sin-soporte')
      return
    }

    try {
      setEstado('solicitando')

      // Pedir permiso
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setEstado('denegado')
        return
      }

      // Importar dinámicamente (solo en cliente)
      const { getMessaging, getToken } = await import('firebase/messaging')

      const messaging = getMessaging(app)

      // Registrar service worker
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      )

      await navigator.serviceWorker.ready

      // Obtener token
      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      })

      if (!fcmToken) {
        setEstado('error')
        return
      }

      // Guardar token en el backend
      const res = await fetch('/api/push/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: fcmToken }),
      })

      if (res.ok) {
        setToken(fcmToken)
        setEstado('concedido')
      } else {
        setEstado('error')
      }
    } catch (err) {
      console.error('Error activando notificaciones:', err)
      setEstado('error')
    }
  }, [habilitado])

  return { estado, token, activar }
}
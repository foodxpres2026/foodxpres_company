// ============================================================
// FIREBASE MESSAGING SERVICE WORKER
// Este archivo DEBE estar en /public/ con nombre exacto
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

// Configuración (mismos valores que en .env.local)
// ⚠️ NO se pueden usar variables de entorno aquí, hay que hardcodear
firebase.initializeApp({
  apiKey: 'AIzaSyCDoKTAyCJ_J1d-7DGFyNMca7-hdlUncoA',
  authDomain: 'foodxpres2026-c3168.firebaseapp.com',
  projectId: 'foodxpres2026-c3168',
  storageBucket: 'foodxpres2026-c3168.firebasestorage.app',
  messagingSenderId: '117612694174',
  appId: '1:117612694174:web:740ead9bb830526231498f',
})

const messaging = firebase.messaging()
// Aplica la nueva configuración en instalaciones PWA ya existentes.
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

// Manejar notificaciones en background
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje recibido en background:', payload)

  const notificationTitle = payload.notification?.title || 'FoodXpres'
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una actualización',
    icon: '/logo-mark.png',
    badge: '/icons/icon-192.png',
    data: payload.data,
    tag: payload.data?.tag || 'foodxpres-notif',
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Manejar click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no, abrir nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

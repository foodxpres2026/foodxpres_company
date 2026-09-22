// ============================================================
// FIREBASE MESSAGING SERVICE WORKER
// Este archivo DEBE estar en /public/ con nombre exacto
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Configuración (mismos valores que en .env.local)
// ⚠️ NO se pueden usar variables de entorno aquí, hay que hardcodear
firebase.initializeApp({
  apiKey: 'AIzaSyBD0BZ8K834Uhq4cEwxFTftc2dHL-TqMpw',
  authDomain: 'foodxpresrvrddev.firebaseapp.com',
  projectId: 'foodxpresrvrddev',
  storageBucket: 'foodxpresrvrddev.firebasestorage.app',
  messagingSenderId: '39840031435',
  appId: '1:39840031435:web:f29dd6e53081f66cdcf14e',
})

const messaging = firebase.messaging()

// Manejar notificaciones en background
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje recibido en background:', payload)

  const notificationTitle = payload.notification?.title || 'FoodXpres'
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una actualización',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data,
    tag: payload.data?.tag || 'foodxpres-notif',
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Manejar click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

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
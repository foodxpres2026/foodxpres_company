importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCDoKTAyCJ_J1d-7DGFyNMca7-hdlUncoA',
  authDomain: 'foodxpres2026-c3168.firebaseapp.com',
  projectId: 'foodxpres2026-c3168',
  storageBucket: 'foodxpres2026-c3168.firebasestorage.app',
  messagingSenderId: '117612694174',
  appId: '1:117612694174:web:ed90e8acb962a92a31498f',
})

const messaging = firebase.messaging()
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'FoodXpres Driver'
  const options = {
    body: payload.notification?.body || 'Hay un pedido disponible',
    icon: '/logo-mark.png', badge: '/icons/icon-192.png',
    data: payload.data || {}, tag: payload.data?.tag || 'foodxpres-driver',
  }
  return self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const existing = list.find((client) => client.url.startsWith(self.location.origin))
    return existing?.focus ? existing.focus().then(() => existing.navigate?.(url)) : clients.openWindow(url)
  }))
})

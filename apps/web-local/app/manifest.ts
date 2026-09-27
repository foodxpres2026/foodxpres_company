import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/local', name: 'FoodXpres Local', short_name: 'FoodXpres Local',
    description: 'Acceso para locales asociados a FoodXpres', start_url: '/', scope: '/',
    display: 'standalone', background_color: '#0a0a0a', theme_color: '#7ed321', lang: 'es-PE',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

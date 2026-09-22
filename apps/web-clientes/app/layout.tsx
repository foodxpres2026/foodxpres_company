import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'FoodXpres — Delivery en Pucallpa',
  description:
    'Pide tu comida favorita en Pucallpa. Rápido, fácil y al mejor precio.',
  keywords: 'delivery, pucallpa, comida, restaurantes, comida a domicilio',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'FoodXpres',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'FoodXpres — Delivery en Pucallpa',
    description: 'Pide tu comida favorita en Pucallpa',
    type: 'website',
    locale: 'es_PE',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A0A0A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FoodXpres" />
      </head>
      <body className="antialiased min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
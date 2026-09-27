import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  metadataBase: new URL(
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:3000'}`,
  ),
  title: {
    default: 'FoodXpres | Delivery de comida en Pucallpa',
    template: '%s | FoodXpres',
  },
  description:
    'Pide comida de restaurantes de Pucallpa con FoodXpres. Explora menús, encuentra tus platos favoritos y recibe tu pedido por delivery.',
  applicationName: 'FoodXpres',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  keywords: [
    'FoodXpres',
    'delivery Pucallpa',
    'comida a domicilio Pucallpa',
    'restaurantes Pucallpa',
    'pedir comida online',
  ],
  alternates: { canonical: '/' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'FoodXpres',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'FoodXpres | Delivery de comida en Pucallpa',
    description:
      'Pide comida de restaurantes de Pucallpa y recibe tu pedido por delivery.',
    type: 'website',
    locale: 'es_PE',
    siteName: 'FoodXpres',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FoodXpres | Delivery de comida en Pucallpa',
    description:
      'Pide comida de restaurantes de Pucallpa y recibe tu pedido por delivery.',
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

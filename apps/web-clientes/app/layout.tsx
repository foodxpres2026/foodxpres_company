import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FoodXpres — Delivery en Pucallpa',
  description:
    'Pide tu comida favorita en Pucallpa. Rápido, fácil y al mejor precio.',
  keywords: 'delivery, pucallpa, comida, restaurantes, comida a domicilio',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  )
}
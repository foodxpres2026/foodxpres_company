import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FOODXPRES Admin',
  description: 'Panel de administración FOODXPRES',
  applicationName: 'FOODXPRES Admin',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'FOODXPRES Admin', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#7ed321', viewportFit: 'cover' }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}

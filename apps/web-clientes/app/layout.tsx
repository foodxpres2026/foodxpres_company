import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FoodXpres',
  description: 'Pide tu comida favorita en Pucallpa',
}

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
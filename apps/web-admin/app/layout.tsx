import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FoodXpres Admin',
  description: 'Panel de administración FoodXpres',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#0A0A0A] text-white">
        {children}
      </body>
    </html>
  )
}
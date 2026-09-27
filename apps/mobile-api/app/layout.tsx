import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FoodXpres Mobile API',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>
}

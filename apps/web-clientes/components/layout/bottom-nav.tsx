'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/buscar', label: 'Buscar', icon: '🔍' },
  { href: '/mis-pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // No mostrar en login/registro
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/recuperar')
  ) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface-dark/95 backdrop-blur-lg border-t border-line md:hidden safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-colors ${
                active ? 'text-brand' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
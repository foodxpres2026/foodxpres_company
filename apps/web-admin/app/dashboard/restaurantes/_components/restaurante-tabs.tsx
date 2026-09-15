'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { segment: '', label: 'Información', icon: 'ℹ️' },
  { segment: '/menu', label: 'Menú', icon: '🍽️' },
  { segment: '/subcategorias', label: 'Subcategorías', icon: '📂' },
]

export default function RestauranteTabs({
  restauranteId,
}: {
  restauranteId: string
}) {
  const pathname = usePathname()
  const base = `/dashboard/restaurantes/${restauranteId}`

  return (
    <div className="flex gap-1 bg-surface border border-line rounded-xl p-1 overflow-x-auto">
      {TABS.map((tab) => {
        const href = `${base}${tab.segment}`
        const active =
          tab.segment === ''
            ? pathname === base
            : pathname.startsWith(href)

        return (
          <Link
            key={tab.segment}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? 'bg-brand text-black'
                : 'text-gray-400 hover:text-white hover:bg-surface-light'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
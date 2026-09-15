'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { segment: '', label: 'Información', icon: 'ℹ️', key: 'info' },
  { segment: '/menu', label: 'Menú', icon: '🍽️', key: 'menu' },
  {
    segment: '/subcategorias',
    label: 'Subcategorías',
    icon: '📂',
    key: 'subcategorias',
  },
] as const

export default function RestauranteTabs({
  restauranteId,
  counts,
}: {
  restauranteId: string
  counts?: { menu?: number; subcategorias?: number }
}) {
  const pathname = usePathname()
  const base = `/dashboard/restaurantes/${restauranteId}`

  return (
    <div className="flex gap-1 bg-surface border border-line rounded-xl p-1 overflow-x-auto">
      {TABS.map((tab) => {
        const href = `${base}${tab.segment}`
        const active =
          tab.segment === '' ? pathname === base : pathname.startsWith(href)

        const count =
          tab.key === 'menu'
            ? counts?.menu
            : tab.key === 'subcategorias'
            ? counts?.subcategorias
            : undefined

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
            {count !== undefined && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  active
                    ? 'bg-black/20 text-black'
                    : 'bg-surface-light text-gray-500'
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
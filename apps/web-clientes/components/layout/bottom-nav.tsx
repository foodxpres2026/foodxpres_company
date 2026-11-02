'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/buscar', label: 'Buscar', icon: '🔍' },
  { href: '/mis-pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [pedidoActivo, setPedidoActivo] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    async function revisarPedidoActivo() {
      try {
        const response = await fetch('/api/pedidos?filtro=activos', { cache: 'no-store' })
        const result = await response.json()
        if (!vigente || !response.ok || !result.ok) return
        const pedido = result.data?.[0]
        setPedidoActivo(pedido?.codigo ? `/pedido/${pedido.codigo}` : null)
      } catch {
        if (vigente) setPedidoActivo(null)
      }
    }
    void revisarPedidoActivo()
    const interval = window.setInterval(revisarPedidoActivo, 30_000)
    return () => { vigente = false; window.clearInterval(interval) }
  }, [])

  // No mostrar en login/registro
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/recuperar')
  ) {
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface-dark/95 backdrop-blur-lg border-t border-line md:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const href = item.href === '/mis-pedidos' && pedidoActivo ? pedidoActivo : item.href
          const supervisar = item.href === '/mis-pedidos' && Boolean(pedidoActivo)
          const active = supervisar || (
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          )

          return (
            <Link
              key={item.href}
              href={href}
              aria-label={supervisar ? 'Supervisa tu pedido activo' : item.label}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-colors ${
                active ? 'text-brand' : 'text-gray-500'
              }`}
            >
              <span className="relative text-xl">
                {item.icon}
                {supervisar && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-dark bg-brand animate-pulse" />}
              </span>
              <span className={`text-[10px] font-medium ${supervisar ? 'text-brand' : ''}`}>{supervisar ? 'Supervisa' : item.label}</span>
              {supervisar && <span className="text-[8px] font-bold uppercase tracking-wide text-brand/80">En curso</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

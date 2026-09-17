'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import UserMenu from './user-menu'

interface HeaderProps {
  user: {
    nombre: string
    celular: string
  } | null
  cartCount: number
}

export default function Header({ user, cartCount }: HeaderProps) {
  const router = useRouter()
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (busquedaAbierta) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [busquedaAbierta])

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`)
      setBusquedaAbierta(false)
      setQuery('')
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-dark/95 backdrop-blur-lg border-b border-line">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-2.5">
          <div className="flex items-center gap-2 md:gap-3">
            {/* LOGO */}
            <Link
              href="/"
              className="flex items-center gap-1.5 flex-shrink-0"
              onClick={() => setBusquedaAbierta(false)}
            >
              <span className="text-2xl leading-none">🐯</span>
              <span className="text-base font-black tracking-tight hidden sm:inline leading-none">
                FOOD<span className="text-brand">X</span>PRES
              </span>
            </Link>

            {/* BÚSQUEDA (desktop) */}
            <button
              type="button"
              onClick={() => setBusquedaAbierta(true)}
              className="hidden md:flex flex-1 items-center gap-2 px-3.5 py-2 bg-surface border border-line rounded-xl text-gray-500 hover:border-brand/40 transition-colors text-left text-sm min-w-0"
            >
              <span className="text-base leading-none">🔍</span>
              <span className="truncate">¿Qué se te antoja hoy?</span>
            </button>

            {/* ESPACIADOR mobile */}
            <div className="flex-1 md:hidden" />

            {/* ACCIONES */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              {/* BÚSQUEDA (mobile) */}
              <button
                type="button"
                onClick={() => setBusquedaAbierta(true)}
                className="md:hidden w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center hover:border-brand/40 transition-colors text-base"
                aria-label="Buscar"
              >
                🔍
              </button>

              {/* CARRITO */}
              <Link
                href="/carrito"
                className="relative w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface border border-line flex items-center justify-center hover:border-brand/40 transition-colors text-base md:text-lg"
                aria-label="Carrito"
              >
                🛒
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand text-black text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* USER */}
              {user ? (
                <UserMenu nombre={user.nombre} celular={user.celular} />
              ) : (
                <Link
                  href="/login"
                  className="bg-brand hover:bg-brand-dark text-black font-bold text-xs px-3 py-2 md:px-4 rounded-xl transition-colors whitespace-nowrap"
                >
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MODAL DE BÚSQUEDA */}
      {busquedaAbierta && (
        <div className="fixed inset-0 z-50 bg-surface-dark flex flex-col">
          <div className="p-3 md:p-4 border-b border-line">
            <form
              onSubmit={handleBuscar}
              className="max-w-3xl mx-auto flex items-center gap-2 md:gap-3"
            >
              <button
                type="button"
                onClick={() => {
                  setBusquedaAbierta(false)
                  setQuery('')
                }}
                className="text-gray-400 hover:text-white text-xl p-1 flex-shrink-0"
              >
                ←
              </button>
              <div className="flex-1 flex items-center bg-surface border border-brand/40 rounded-xl px-3.5">
                <span className="text-brand mr-2 text-base leading-none">🔍</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  placeholder="Busca locales, platos y productos..."
                  className="flex-1 bg-transparent py-3 text-white placeholder-gray-600 focus:outline-none text-sm"
                />
              </div>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-center text-gray-500 text-sm py-12">
              {query.trim()
                ? `Presiona Enter para buscar "${query}"`
                : 'Escribe para buscar...'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
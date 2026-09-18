'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import UserMenu from './user-menu'
import Logo from './logo'
import { useCarrito } from '@/lib/carrito/store'
import {
  useDireccionActual,
  type DireccionLocal,
} from '@/hooks/use-direccion-actual'
import DireccionModalWrapper from '@/components/direcciones/direccion-modal-wrapper'
import DireccionesSelector from '@/components/direcciones/direcciones-selector'

interface HeaderProps {
  user: {
    nombre: string
    celular: string
  } | null
  direccionDeBD?: DireccionLocal | null
}

export default function Header({ user, direccionDeBD }: HeaderProps) {
  const router = useRouter()
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [modalDireccionOpen, setModalDireccionOpen] = useState(false)
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  const totalItems = useCarrito((s) => s.totalItems())
  const direccionActual = useDireccionActual(direccionDeBD ?? null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  function abrirDireccion() {
    if (user) {
      setSelectorAbierto(true)
    } else {
      setModalDireccionOpen(true)
    }
  }

  const sinDireccion = mounted && !direccionActual

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-dark/95 backdrop-blur-lg border-b border-line">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-2.5">
          <div className="flex items-center gap-2 md:gap-3">
            {/* LOGO - Solo el tigre, sin texto (ya está dentro del logo.png) */}
            <div
              className="flex-shrink-0"
              onClick={() => setBusquedaAbierta(false)}
            >
              <Logo size={36} linkeado />
            </div>

            {/* DIRECCIÓN */}
            <button
              type="button"
              onClick={abrirDireccion}
              className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-xs max-w-[220px] ${
                direccionActual
                  ? 'bg-surface border border-line text-gray-300 hover:border-brand/40'
                  : 'bg-jaguar/10 border border-jaguar/40 text-jaguar hover:bg-jaguar/20'
              }`}
            >
              <span>📍</span>
              <span className="truncate font-medium">
                {direccionActual?.direccion || 'Añadir dirección'}
              </span>
              <span className="text-gray-600">▾</span>
            </button>

            {/* BÚSQUEDA (desktop) */}
            <button
              type="button"
              onClick={() => setBusquedaAbierta(true)}
              className="hidden md:flex flex-1 items-center gap-2 px-3.5 py-2 bg-surface border border-line rounded-xl text-gray-500 hover:border-brand/40 transition-colors text-left text-sm min-w-0"
            >
              <span className="text-base leading-none">🔍</span>
              <span className="truncate">¿Qué se te antoja hoy?</span>
            </button>

            <div className="flex-1 md:hidden" />

            {/* ACCIONES */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setBusquedaAbierta(true)}
                className="md:hidden w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center hover:border-brand/40 transition-colors text-base"
                aria-label="Buscar"
              >
                🔍
              </button>

              <Link
                href="/carrito"
                className="relative w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface border border-line flex items-center justify-center hover:border-brand/40 transition-colors text-base md:text-lg"
                aria-label="Carrito"
              >
                🛒
                {mounted && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand text-black text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>

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

        {/* BANNER DIRECCIÓN (mobile) */}
        {sinDireccion && (
          <button
            type="button"
            onClick={abrirDireccion}
            className="w-full bg-jaguar/10 border-t border-jaguar/30 px-4 py-2.5 text-left"
          >
            <div className="flex items-center gap-2 max-w-6xl mx-auto">
              <span className="text-base">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-jaguar">
                  ¿A dónde te llevamos?
                </p>
                <p className="text-[10px] text-gray-500">
                  Agrega tu dirección para ver el delivery
                </p>
              </div>
              <span className="text-jaguar text-lg">›</span>
            </div>
          </button>
        )}

        {/* DIRECCIÓN ACTUAL (mobile, si hay) */}
        {mounted && direccionActual && (
          <button
            type="button"
            onClick={abrirDireccion}
            className="md:hidden w-full bg-surface/50 border-t border-line px-4 py-2 text-left"
          >
            <div className="flex items-center gap-2 max-w-6xl mx-auto">
              <span className="text-sm">📍</span>
              <span className="flex-1 text-xs text-gray-400 truncate">
                {direccionActual.direccion}
              </span>
              <span className="text-brand text-xs font-bold">Cambiar</span>
            </div>
          </button>
        )}
      </header>

      {/* MODAL BÚSQUEDA */}
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
                <span className="text-brand mr-2 text-base leading-none">
                  🔍
                </span>
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

      {/* SELECTOR DE DIRECCIONES (cliente logueado) */}
      {user && (
        <DireccionesSelector
          open={selectorAbierto}
          onClose={() => setSelectorAbierto(false)}
          estaLogueado={true}
        />
      )}

      {/* MODAL CREAR DIRECCIÓN (cliente anónimo) */}
      {!user && (
        <DireccionModalWrapper
          open={modalDireccionOpen}
          onClose={() => setModalDireccionOpen(false)}
          estaLogueado={false}
          initialData={direccionActual ?? undefined}
        />
      )}
    </>
  )
}
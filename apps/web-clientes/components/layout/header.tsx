'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useSyncExternalStore } from 'react'
import UserMenu from './user-menu'
import Logo from './logo'
import { useCarrito } from '@/lib/carrito/store'
import {
  useDireccionActual,
  type DireccionLocal,
} from '@/hooks/use-direccion-actual'
import DireccionModalWrapper from '@/components/direcciones/direccion-modal-wrapper'
import DireccionesSelector from '@/components/direcciones/direcciones-selector'
import { ABRIR_DIRECCION_EVENT } from '@/lib/direccion-events'

const subscribeToMount = () => () => {}
const getClientMounted = () => true
const getServerMounted = () => false

interface HeaderProps {
  user: {
    nombre: string
    celular: string
  } | null
  direccionDeBD?: DireccionLocal | null
}

export default function Header({ user, direccionDeBD }: HeaderProps) {
  const pathname = usePathname()
  const mounted = useSyncExternalStore(subscribeToMount, getClientMounted, getServerMounted)
  const [modalDireccionOpen, setModalDireccionOpen] = useState(false)
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  const totalItems = useCarrito((s) => s.totalItems())
  const direccionActual = useDireccionActual(direccionDeBD ?? null)

  useEffect(() => {
    const abrirDesdeOtraSeccion = () => {
      if (user) setSelectorAbierto(true)
      else setModalDireccionOpen(true)
    }
    window.addEventListener(ABRIR_DIRECCION_EVENT, abrirDesdeOtraSeccion)
    return () => window.removeEventListener(ABRIR_DIRECCION_EVENT, abrirDesdeOtraSeccion)
  }, [user])

  function abrirDireccion() {
    if (user) {
      setSelectorAbierto(true)
    } else {
      setModalDireccionOpen(true)
    }
  }

  const sinDireccion = mounted && !direccionActual
  const enRestaurante = pathname.startsWith('/restaurante/')
  const ocultarDireccionMovil = enRestaurante || pathname === '/carrito'

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-dark/95 backdrop-blur-lg border-b border-line">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-2.5">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Emblema FOODXPRES para el encabezado compacto */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Logo size={36} linkeado />
              <span className="text-white font-black tracking-tight text-sm md:text-base whitespace-nowrap">FOODXPRES</span>
            </div>

            {/* BÚSQUEDA (desktop) */}
            {pathname !== '/buscar' && (
              <Link
                href="/buscar"
                className="hidden md:flex flex-1 items-center gap-2 px-3.5 py-2 bg-surface border border-line rounded-xl text-gray-500 hover:border-brand/40 transition-colors text-left text-sm min-w-0"
              >
                <span className="text-base leading-none">🔍</span>
                <span className="truncate">¿Qué se te antoja hoy?</span>
              </Link>
            )}

            <div className="flex-1 md:hidden" />

            {/* ACCIONES */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
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
      </header>

      {/* Selector de ubicación fuera de la barra fija, también en escritorio */}
      {pathname !== '/carrito' && (!sinDireccion || ocultarDireccionMovil) && (
        <div className="hidden md:block max-w-6xl mx-auto px-4 w-full">
          <button
            type="button"
            onClick={abrirDireccion}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b transition-colors ${
              direccionActual
                ? 'border-line text-gray-300 hover:text-white'
                : 'border-jaguar/30 text-jaguar'
            }`}
          >
            <span>📍</span>
            <span className="text-gray-500">Entregar en</span>
            <span className="truncate font-medium">{direccionActual?.direccion || 'Añadir dirección'}</span>
            <span className="text-brand font-bold ml-auto">Cambiar</span>
          </button>
        </div>
      )}

      {/* BANNER DIRECCIÓN (mobile; se desplaza junto con el contenido) */}
      {!ocultarDireccionMovil && sinDireccion && (
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

      {/* DIRECCIÓN ACTUAL (mobile, si hay; se desplaza junto con el contenido) */}
      {!ocultarDireccionMovil && mounted && direccionActual && (
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

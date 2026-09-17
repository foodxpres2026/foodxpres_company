import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import UserMenu from '@/components/layout/user-menu'

export default async function HomePage() {
  const user = await getSessionUser()

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col">
      <header className="p-5 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-3xl">🐯</span>
          <span className="text-xl font-black tracking-tight">
            FOOD<span className="text-brand">X</span>PRES
          </span>
        </Link>

        {user ? (
          <UserMenu nombre={user.nombre} celular={user.celular} />
        ) : (
          <Link
            href="/login"
            className="text-sm bg-brand hover:bg-brand-dark text-black font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Ingresar
          </Link>
        )}
      </header>

      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            El sabor de <span className="text-brand">Pucallpa</span> en tu puerta
          </h1>
          <p className="text-gray-500 mb-8">
            Los mejores restaurantes de la ciudad, a un toque de distancia.
          </p>
          {user && (
            <div className="bg-surface border border-line rounded-2xl p-4 inline-block">
              <p className="text-sm text-gray-400">
                ✅ Sesión activa como <strong className="text-white">{user.nombre}</strong>
              </p>
            </div>
          )}
          <p className="text-xs text-gray-700 mt-6">
            🚧 Home en construcción — FASE 2
          </p>
        </div>
      </div>
    </div>
  )
}
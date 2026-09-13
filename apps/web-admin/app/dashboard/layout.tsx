import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './logout-button'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: '📊' },
  { href: '/dashboard/restaurantes', label: 'Restaurantes', icon: '🏪' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/dashboard/drivers', label: 'Drivers', icon: '🏍️' },
  { href: '/dashboard/clientes', label: 'Clientes', icon: '👥' },
  { href: '/dashboard/admins', label: 'Admins', icon: '🔐' },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-60 bg-[#111] border-b md:border-b-0 md:border-r border-[#222] flex flex-col md:min-h-screen">
        {/* LOGO */}
        <div className="p-5 border-b border-[#222] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7ED321]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🐯</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-black tracking-tight text-sm">
              FOOD<span className="text-[#7ED321]">X</span>PRES
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              Admin
            </p>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors whitespace-nowrap"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* USER */}
        <div className="p-4 border-t border-[#222] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#7ED321]/20 flex items-center justify-center text-xs font-bold text-[#7ED321] flex-shrink-0">
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-medium truncate">
              {user.nombre}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
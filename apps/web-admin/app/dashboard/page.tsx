import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">FoodXpres Admin</h1>
            <p className="text-sm text-gray-500">Panel de administración</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Hola, <strong>{user.nombre}</strong>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">Restaurantes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">Pedidos hoy</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">Drivers activos</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 mt-8 text-center text-gray-500">
          <p>Bienvenido al panel. Aquí verás los locales, pedidos y repartidores.</p>
          <p className="text-sm mt-2">(Módulos por implementar)</p>
        </div>
      </main>
    </div>
  )
}
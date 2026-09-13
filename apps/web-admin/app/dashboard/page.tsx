import { getSessionUser } from '@/lib/auth'

export default async function DashboardPage() {
  const user = await getSessionUser()

  return (
    <div className="p-5 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Hola, {user?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Panel de administración FoodXpres
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Restaurantes" value="0" icon="🏪" />
        <StatCard label="Pedidos hoy" value="0" icon="📦" />
        <StatCard label="Drivers activos" value="0" icon="🏍️" />
        <StatCard label="Clientes" value="0" icon="👥" />
      </div>

      <div className="bg-[#151515] border border-[#222] rounded-2xl p-8 mt-6 text-center">
        <p className="text-gray-400">Bienvenido al panel de FoodXpres.</p>
        <p className="text-sm text-gray-600 mt-2">
          Pronto verás aquí los pedidos y estadísticas.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div className="bg-[#151515] border border-[#222] rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
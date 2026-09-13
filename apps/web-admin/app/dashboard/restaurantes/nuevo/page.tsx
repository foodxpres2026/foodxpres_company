import Link from 'next/link'
import RestauranteForm from '../_components/restaurante-form'

export default function NuevoRestaurantePage() {
  return (
    <div className="p-5 md:p-8 max-w-3xl bg-surface-dark min-h-full">
      <div className="mb-6">
        <Link
          href="/dashboard/restaurantes"
          className="text-sm text-gray-500 hover:text-brand"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">
          Nuevo restaurante
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Registra un local para que los clientes puedan pedir
        </p>
      </div>

      <RestauranteForm mode="create" />
    </div>
  )
}
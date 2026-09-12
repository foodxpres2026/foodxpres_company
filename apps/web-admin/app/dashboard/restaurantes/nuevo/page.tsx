import Link from 'next/link'
import RestauranteForm from '../_components/restaurante-form'

export default function NuevoRestaurantePage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/restaurantes"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver a restaurantes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
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
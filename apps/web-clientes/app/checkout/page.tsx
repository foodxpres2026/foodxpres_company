import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'

export default async function CheckoutPage() {
  const user = await getSessionUser()

  return (
    <div className="min-h-screen bg-surface-dark p-5">
      <Link href="/" className="text-sm text-gray-500 hover:text-brand">
        ← Volver
      </Link>
      <div className="mt-10 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-white mb-2">Checkout</h1>
        <p className="text-gray-500">
          Hola {user?.nombre}, aquí irá el resumen de tu pedido.
        </p>
        <p className="text-xs text-gray-700 mt-6">🚧 FASE 4</p>
      </div>
    </div>
  )
}
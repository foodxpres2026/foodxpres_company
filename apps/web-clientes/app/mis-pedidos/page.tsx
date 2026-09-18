import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import MisPedidosCliente from '@/components/pedidos/mis-pedidos-cliente'

export const dynamic = 'force-dynamic'

export default async function MisPedidosPage() {
  const user = await getSessionUser()

  if (!user) {
    return (
      <>
        <Header user={null} />
        <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h1 className="text-xl font-bold text-white mb-2">
            Inicia sesión para ver tus pedidos
          </h1>
          <a
            href="/login?redirect=/mis-pedidos"
            className="inline-block bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-xl transition-colors mt-3"
          >
            Ingresar
          </a>
        </main>
        <BottomNav />
      </>
    )
  }

  // Dirección actual para el header
  const dirRows = (await sql`
    SELECT id, etiqueta, direccion, referencia, lat, lng
    FROM direcciones
    WHERE usuario_id = ${user.id} AND es_predeterminada = TRUE
    LIMIT 1
  `) as any[]

  const direccionDeBD = dirRows[0] || null

  return (
    <>
      <Header user={user} direccionDeBD={direccionDeBD} />

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-white">Mis pedidos 📦</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial y seguimiento de tus pedidos
          </p>
        </div>

        <MisPedidosCliente />
      </main>

      <BottomNav />
    </>
  )
}
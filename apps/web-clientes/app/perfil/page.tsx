import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi perfil · FoodXpres',
  description: 'Gestiona tu cuenta',
}
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import PerfilCliente from '@/components/perfil/perfil-cliente'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const user = await getSessionUser()

  if (!user) {
    return (
      <>
        <Header user={null} />
        <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h1 className="text-xl font-bold text-white mb-2">
            Inicia sesión para ver tu perfil
          </h1>
          <a
            href="/login?redirect=/perfil"
            className="inline-block bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-xl transition-colors mt-3"
          >
            Ingresar
          </a>
        </main>
        <BottomNav />
      </>
    )
  }

  // Dirección para el header
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
        <h1 className="text-2xl font-black text-white mb-5">Mi perfil 👤</h1>

        <PerfilCliente
          user={{
            nombre: user.nombre,
            celular: user.celular,
          }}
        />
      </main>

      <BottomNav />
    </>
  )
}
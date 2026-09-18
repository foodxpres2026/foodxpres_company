import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buscar · FoodXpres',
  description: 'Busca restaurantes, platos y productos',
}
import { Suspense } from 'react'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import BuscarCliente from '@/components/buscar/buscar-cliente'

export const dynamic = 'force-dynamic'

export default async function BuscarPage() {
  const user = await getSessionUser()

  let direccionDeBD = null
  if (user) {
    const dirRows = (await sql`
      SELECT id, etiqueta, direccion, referencia, lat, lng
      FROM direcciones
      WHERE usuario_id = ${user.id} AND es_predeterminada = TRUE
      LIMIT 1
    `) as any[]
    direccionDeBD = dirRows[0] || null
  }

  return (
    <>
      <Header user={user} direccionDeBD={direccionDeBD} />

      <main className="max-w-6xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <Suspense
          fallback={
            <div className="text-center py-12 text-gray-500 text-sm">
              Cargando...
            </div>
          }
        >
          <BuscarCliente />
        </Suspense>
      </main>

      <BottomNav />
    </>
  )
}
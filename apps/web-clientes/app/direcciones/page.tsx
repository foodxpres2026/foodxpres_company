import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis direcciones · FoodXpres',
  description: 'Gestiona tus direcciones de entrega',
}
import Link from 'next/link'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import DireccionesEditor from '@/components/direcciones/direcciones-editor'

export const dynamic = 'force-dynamic'

export default async function DireccionesPage() {
  const user = await getSessionUser()

  let direcciones: any[] = []
  let direccionDeBD = null

  if (user) {
    direcciones = (await sql`
      SELECT id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
      FROM direcciones
      WHERE usuario_id = ${user.id}
      ORDER BY es_predeterminada DESC, creado_en DESC
    `) as any[]
    direccionDeBD = direcciones.find((d) => d.es_predeterminada) || null
  }

  return (
    <>
      <Header user={user} direccionDeBD={direccionDeBD} />

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand transition-colors mb-4"
        >
          <span>←</span>
          <span>Volver al inicio</span>
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-black text-white">Mi dirección</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user
              ? 'Gestiona dónde quieres recibir tus pedidos'
              : 'Por ahora guardaremos tu dirección en este dispositivo. Al registrarte se guardará en tu cuenta.'}
          </p>
        </div>

        <DireccionesEditor initialData={direcciones} estaLogueado={!!user} />
      </main>

      <BottomNav />
    </>
  )
}
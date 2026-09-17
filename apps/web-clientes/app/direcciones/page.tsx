import Link from 'next/link'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import DireccionesEditor from '@/components/direcciones/direcciones-editor'

export const dynamic = 'force-dynamic'

export default async function DireccionesPage() {
  const user = await getSessionUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <p className="text-gray-400">Debes iniciar sesión</p>
      </div>
    )
  }

  const direcciones = (await sql`
    SELECT id, etiqueta, direccion, referencia, lat, lng, es_predeterminada
    FROM direcciones
    WHERE usuario_id = ${user.id}
    ORDER BY es_predeterminada DESC, creado_en DESC
  `) as any[]

  // Dirección actual predeterminada (para el header)
  const direccionActual =
    (direcciones.find((d: any) => d.es_predeterminada) as any) || null

  return (
    <>
      <Header user={user} direccionActual={direccionActual} />

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8">
        {/* BOTÓN ATRÁS */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand transition-colors mb-4"
        >
          <span>←</span>
          <span>Volver al inicio</span>
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-black text-white">Mis direcciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona dónde quieres recibir tus pedidos
          </p>
        </div>

        <DireccionesEditor initialData={direcciones} />
      </main>

      <BottomNav />
    </>
  )
}
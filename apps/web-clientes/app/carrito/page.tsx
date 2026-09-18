import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import CarritoCliente from '@/components/carrito/carrito-cliente'

export const dynamic = 'force-dynamic'

export default async function CarritoPage() {
  const user = await getSessionUser()

  // Leer dirección predeterminada CON lat/lng
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

  // Config del sistema
  const config = (await sql`
    SELECT costo_vip FROM configuracion_sistema WHERE id = 1 LIMIT 1
  `) as any[]

  const costoVip = Number(config[0]?.costo_vip || 0)

  return (
    <>
      <Header user={user} direccionDeBD={direccionDeBD} />

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <h1 className="text-2xl font-black text-white mb-1">Mi pedido 🛒</h1>
        <p className="text-sm text-gray-500 mb-5">
          Revisa y confirma tu pedido
        </p>

        <CarritoCliente
          estaLogueado={!!user}
          direccionDeBD={
            direccionDeBD
              ? {
                  id: direccionDeBD.id,
                  etiqueta: direccionDeBD.etiqueta,
                  direccion: direccionDeBD.direccion,
                  referencia: direccionDeBD.referencia || '',
                  lat: Number(direccionDeBD.lat),
                  lng: Number(direccionDeBD.lng),
                }
              : null
          }
          costoVip={costoVip}
        />
      </main>

      <BottomNav />
    </>
  )
}
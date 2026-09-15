import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import RestauranteTabs from '../_components/restaurante-tabs'

async function getRestaurante(id: string) {
  const rows = await sql`
    SELECT id, nombre, subtitulo, activo
    FROM restaurantes
    WHERE id = ${id}
    LIMIT 1
  `
  return rows[0] as
    | { id: string; nombre: string; subtitulo: string | null; activo: boolean }
    | undefined
}

async function getCounts(id: string) {
  const [menu, subcategorias] = await Promise.all([
    sql`SELECT COUNT(*)::int as total FROM platos WHERE restaurante_id = ${id}`,
    sql`SELECT COUNT(*)::int as total FROM subcategorias WHERE restaurante_id = ${id}`,
  ])
  return {
    menu: menu[0].total as number,
    subcategorias: subcategorias[0].total as number,
  }
}

export default async function RestauranteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const restaurante = await getRestaurante(id)

  if (!restaurante) notFound()

  const counts = await getCounts(id)

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <Link
          href="/dashboard/restaurantes"
          className="text-sm text-gray-500 hover:text-brand"
        >
          ← Volver a restaurantes
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {restaurante.nombre}
          </h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              restaurante.activo
                ? 'bg-brand/15 text-brand'
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            {restaurante.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        {restaurante.subtitulo && (
          <p className="text-gray-500 text-sm mt-1">{restaurante.subtitulo}</p>
        )}
      </div>

      <div className="mb-6">
        <RestauranteTabs restauranteId={id} counts={counts} />
      </div>

      <div className="max-w-3xl">{children}</div>
    </div>
  )
}
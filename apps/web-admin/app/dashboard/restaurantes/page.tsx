import Link from 'next/link'
import { sql } from '@/lib/db'
import AccionesFila from './_components/acciones-fila'

interface Restaurante {
  id: string
  slug: string
  nombre: string
  subtitulo: string | null
  direccion_fisica: string | null
  celular: string | null
  monto_minimo: string
  activo: boolean
  creado_en: string
}

async function getRestaurantes(): Promise<Restaurante[]> {
  return sql<Restaurante[]>`
    SELECT id, slug, nombre, subtitulo, direccion_fisica, celular,
           monto_minimo, activo, creado_en
    FROM restaurantes
    ORDER BY activo DESC, creado_en DESC
  `
}

export default async function RestaurantesPage() {
  const restaurantes = await getRestaurantes()
  const activos = restaurantes.filter((r) => r.activo)

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Restaurantes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {restaurantes.length} registrado{restaurantes.length === 1 ? '' : 's'}
            {' · '}
            {activos.length} activo{activos.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/dashboard/restaurantes/nuevo"
          className="bg-brand hover:bg-brand-dark text-black font-bold text-sm px-5 py-3 rounded-xl transition-colors text-center active:scale-[0.98]"
        >
          + Nuevo restaurante
        </Link>
      </div>

      {restaurantes.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🏪</p>
          <p className="text-gray-400">No hay restaurantes registrados</p>
          <Link
            href="/dashboard/restaurantes/nuevo"
            className="text-brand hover:underline text-sm mt-3 inline-block"
          >
            Crear el primero →
          </Link>
        </div>
      ) : (
        <>
          {/* MOBILE */}
          <div className="md:hidden space-y-3">
            {restaurantes.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/restaurantes/${r.id}`}
                className="block bg-surface border border-line rounded-2xl p-4 hover:border-brand/40 transition-colors"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white truncate">
                      {r.nombre}
                    </h3>
                    {r.subtitulo && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {r.subtitulo}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      r.activo
                        ? 'bg-brand/15 text-brand'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {r.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  📍 {r.direccion_fisica || 'Sin dirección'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  🛵 Mínimo S/ {Number(r.monto_minimo).toFixed(2)}
                </p>
              </Link>
            ))}
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block bg-surface border border-line rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-dark border-b border-line">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Dirección
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Celular
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Mínimo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {restaurantes.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-light transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/restaurantes/${r.id}`}
                        className="font-medium text-white hover:text-brand"
                      >
                        {r.nombre}
                      </Link>
                      {r.subtitulo && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.subtitulo}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {r.direccion_fisica || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {r.celular || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      S/ {Number(r.monto_minimo).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <AccionesFila
                        id={r.id}
                        nombre={r.nombre}
                        activo={r.activo}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/restaurantes/${r.id}`}
                        className="text-xs text-brand hover:underline"
                      >
                        Editar →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
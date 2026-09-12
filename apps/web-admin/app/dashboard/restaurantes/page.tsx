import Link from 'next/link'
import { sql } from '@/lib/db'

interface Restaurante {
  id: string
  slug: string
  nombre: string
  subtitulo: string | null
  celular: string | null
  direccion_fisica: string | null
  activo: boolean
  creado_en: string
}

async function getRestaurantes(): Promise<Restaurante[]> {
  return sql<Restaurante[]>`
    SELECT id, slug, nombre, subtitulo, celular, direccion_fisica, activo, creado_en
    FROM restaurantes
    ORDER BY creado_en DESC
  `
}

export default async function RestaurantesPage() {
  const restaurantes = await getRestaurantes()

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurantes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {restaurantes.length} registrado{restaurantes.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/dashboard/restaurantes/nuevo"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo restaurante
        </Link>
      </div>

      {restaurantes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">No hay restaurantes registrados aún.</p>
          <Link
            href="/dashboard/restaurantes/nuevo"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Crear el primero →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
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
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {restaurantes.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/restaurantes/${r.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {r.nombre}
                    </Link>
                    {r.subtitulo && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.subtitulo}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {r.direccion_fisica || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {r.celular || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        r.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
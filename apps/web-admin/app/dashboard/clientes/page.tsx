import { sql } from '@/lib/db'
import Link from 'next/link'

interface Cliente {
  id: string
  nombre: string
  celular: string
  activo: boolean
  creado_en: string
  num_direcciones: number
  num_pedidos: number
  total_gastado: string
}

async function getClientes(): Promise<Cliente[]> {
  return (await sql`
    SELECT 
      u.id,
      u.nombre,
      u.celular,
      u.activo,
      u.creado_en,
      (SELECT COUNT(*)::int FROM direcciones WHERE usuario_id = u.id) as num_direcciones,
      (SELECT COUNT(*)::int FROM pedidos WHERE usuario_id = u.id) as num_pedidos,
      (SELECT COALESCE(SUM(total), 0)::numeric FROM pedidos WHERE usuario_id = u.id) as total_gastado
    FROM usuarios u
    WHERE u.role = 'CUSTOMER'
    ORDER BY u.creado_en DESC
  `) as Cliente[]
}

export default async function ClientesPage() {
  const clientes = await getClientes()

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">
          {clientes.length} registrado{clientes.length === 1 ? '' : 's'}
        </p>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">👥</p>
          <p className="text-gray-400">No hay clientes registrados</p>
          <p className="text-xs text-gray-600 mt-1">
            Los clientes aparecerán aquí cuando se registren en la web
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          {/* HEADER */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-line bg-surface-dark text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-4">Cliente</div>
            <div className="col-span-2">Direcciones</div>
            <div className="col-span-2">Pedidos</div>
            <div className="col-span-3">Total gastado</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          <ul className="divide-y divide-line">
            {clientes.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-surface-light transition-colors items-center"
              >
                <div className="md:col-span-4 min-w-0">
                  <p className="font-medium text-white truncate">
                    {c.nombre}
                  </p>
                  <p className="text-xs text-gray-500">📱 {c.celular}</p>
                </div>

                <div className="md:col-span-2 flex md:block items-center gap-2 text-sm text-gray-400">
                  <span className="text-xs text-gray-500 md:hidden">📍 </span>
                  {c.num_direcciones} dirección
                  {c.num_direcciones === 1 ? '' : 'es'}
                </div>

                <div className="md:col-span-2 flex md:block items-center gap-2 text-sm text-gray-400">
                  <span className="text-xs text-gray-500 md:hidden">📦 </span>
                  {c.num_pedidos} pedido{c.num_pedidos === 1 ? '' : 's'}
                </div>

                <div className="md:col-span-3 text-sm">
                  <span className="font-bold text-brand">
                    S/ {Number(c.total_gastado).toFixed(2)}
                  </span>
                </div>

                <div className="md:col-span-1 md:text-right">
                  <Link
                    href={`/dashboard/clientes/${c.id}`}
                    className="text-xs text-brand hover:underline"
                  >
                    Ver →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
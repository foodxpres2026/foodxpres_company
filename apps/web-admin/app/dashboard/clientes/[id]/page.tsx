import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'

async function getCliente(id: string) {
  const rows = await sql`
    SELECT id, nombre, celular, activo, creado_en
    FROM usuarios
    WHERE id = ${id} AND role = 'CUSTOMER'
    LIMIT 1
  `
  if (rows.length === 0) return null
  const cliente = rows[0] as any

  const direcciones = await sql`
    SELECT id, etiqueta, direccion, referencia, es_predeterminada
    FROM direcciones
    WHERE usuario_id = ${id}
    ORDER BY es_predeterminada DESC, creado_en DESC
  `

  const pedidos = await sql`
    SELECT id, codigo, total, estado_global, creado_en
    FROM pedidos
    WHERE usuario_id = ${id}
    ORDER BY creado_en DESC
    LIMIT 20
  `

  const stats = await sql`
    SELECT 
      COUNT(*)::int as total_pedidos,
      COALESCE(SUM(total), 0)::numeric as total_gastado
    FROM pedidos
    WHERE usuario_id = ${id}
  `

  return { cliente, direcciones, pedidos, stats: stats[0] }
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400',
  ACEPTADO: 'bg-blue-500/15 text-blue-400',
  EN_CAMINO: 'bg-orange-500/15 text-orange-400',
  ENTREGADO: 'bg-brand/15 text-brand',
  CANCELADO: 'bg-gray-500/15 text-gray-400',
}

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getCliente(id)
  if (!data) notFound()

  const { cliente, direcciones, pedidos, stats } = data

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/clientes"
          className="text-sm text-gray-500 hover:text-brand"
        >
          ← Volver a clientes
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">
          {cliente.nombre}
        </h1>
        <p className="text-gray-500 text-sm mt-1">📱 {cliente.celular}</p>
        <p className="text-gray-600 text-xs mt-1">
          Registrado el{' '}
          {new Date(cliente.creado_en).toLocaleDateString('es-PE')}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface border border-line rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Pedidos
          </p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1">
            {stats.total_pedidos}
          </p>
        </div>
        <div className="bg-surface border border-brand/30 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Total gastado
          </p>
          <p className="text-2xl md:text-3xl font-bold text-brand mt-1">
            S/ {Number(stats.total_gastado).toFixed(2)}
          </p>
        </div>
      </div>

      {/* DIRECCIONES */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 mb-4">
        <h3 className="text-base font-bold text-white mb-3">
          📍 Direcciones ({direcciones.length})
        </h3>
        {direcciones.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Sin direcciones registradas
          </p>
        ) : (
          <div className="space-y-2">
            {direcciones.map((d: any) => (
              <div
                key={d.id}
                className="p-3 bg-surface-dark rounded-xl border border-line"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white">
                    {d.etiqueta}
                  </span>
                  {d.es_predeterminada && (
                    <span className="text-[9px] bg-brand/15 text-brand px-1.5 py-0.5 rounded font-bold">
                      Predeterminada
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300">{d.direccion}</p>
                {d.referencia && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ref: {d.referencia}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PEDIDOS */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line">
          <h3 className="text-base font-bold text-white">
            📦 Pedidos ({pedidos.length})
          </h3>
        </div>
        {pedidos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">Sin pedidos aún</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {pedidos.map((p: any) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">
                        {p.codigo}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          ESTADO_COLORES[p.estado_global] ||
                          ESTADO_COLORES.PENDIENTE
                        }`}
                      >
                        {p.estado_global}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {new Date(p.creado_en).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-brand flex-shrink-0">
                    S/ {Number(p.total).toFixed(2)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
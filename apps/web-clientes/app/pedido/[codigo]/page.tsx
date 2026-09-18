import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'

export const dynamic = 'force-dynamic'

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  PREPARANDO: 'Aceptado',
  LISTO: 'Listo',
  ASIGNADO: 'En camino',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400',
  ACEPTADO: 'bg-blue-500/15 text-blue-400',
  PREPARANDO: 'bg-blue-500/15 text-blue-400',
  LISTO: 'bg-cyan-500/15 text-cyan-400',
  ASIGNADO: 'bg-orange-500/15 text-orange-400',
  EN_CAMINO: 'bg-orange-500/15 text-orange-400',
  ENTREGADO: 'bg-brand/15 text-brand',
  RECHAZADO: 'bg-red-500/15 text-red-400',
  CANCELADO: 'bg-gray-500/15 text-gray-400',
}

async function getPedido(codigo: string, usuarioId: string) {
  const rows = (await sql`
    SELECT id, codigo, subtotal, total_envio, propina, vip, costo_vip,
           total, notas, estado_global, creado_en
    FROM pedidos
    WHERE codigo = ${codigo} AND usuario_id = ${usuarioId}
    LIMIT 1
  `) as any[]

  if (rows.length === 0) return null
  const pedido = rows[0]

  const subs = (await sql`
    SELECT 
      sp.id, sp.estado, sp.subtotal, sp.costo_envio,
      sp.distancia_km, sp.direccion_snapshot,
      r.nombre as restaurante_nombre,
      d.nombre as driver_nombre,
      d.celular as driver_celular
    FROM sub_pedidos sp
    INNER JOIN restaurantes r ON r.id = sp.restaurante_id
    LEFT JOIN usuarios d ON d.id = sp.driver_id
    WHERE sp.pedido_id = ${pedido.id}
    ORDER BY sp.creado_en ASC
  `) as any[]

  return { ...pedido, sub_pedidos: subs }
}

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const user = await getSessionUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <p className="text-gray-400">Inicia sesión para ver tu pedido</p>
      </div>
    )
  }

  const pedido = await getPedido(codigo, user.id)
  if (!pedido) notFound()

  return (
    <>
      <Header user={user} />

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8">
        {/* ÉXITO */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand/15 text-4xl mb-3">
            ✅
          </div>
          <h1 className="text-2xl font-black text-white">
            ¡Pedido confirmado!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Código <strong className="text-white">{pedido.codigo}</strong>
          </p>
        </div>

        {/* ESTADO POR LOCAL */}
        <div className="bg-surface border border-line rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-bold text-white text-sm">
              🏪 Estado por local
            </h2>
          </div>

          <div className="divide-y divide-line">
            {pedido.sub_pedidos.map((sp: any) => (
              <div key={sp.id} className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-bold text-white text-sm truncate">
                    {sp.restaurante_nombre}
                  </h3>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${
                      ESTADO_COLORES[sp.estado] || ESTADO_COLORES.PENDIENTE
                    }`}
                  >
                    {ESTADO_LABELS[sp.estado] || sp.estado}
                  </span>
                </div>

                {sp.driver_nombre && (
                  <div className="flex items-center gap-3 p-3 bg-surface-dark rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                      {sp.driver_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-medium truncate">
                        {sp.driver_nombre}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Tu repartidor
                      </p>
                    </div>
                    {sp.driver_celular && (
                      <a
                        href={`tel:+51${sp.driver_celular}`}
                        className="text-xs bg-brand text-black font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                      >
                        📞 Llamar
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RESUMEN */}
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-2 text-sm">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
            Resumen
          </h3>
          <div className="flex justify-between">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">S/ {Number(pedido.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Delivery</span>
            <span className="text-white">S/ {Number(pedido.total_envio).toFixed(2)}</span>
          </div>
          {Number(pedido.propina) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Propina</span>
              <span className="text-white">S/ {Number(pedido.propina).toFixed(2)}</span>
            </div>
          )}
          {pedido.vip && (
            <div className="flex justify-between">
              <span className="text-gray-400">VIP</span>
              <span className="text-yellow-400">S/ {Number(pedido.costo_vip).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-line">
            <span className="font-bold text-white">Total</span>
            <span className="font-black text-brand text-xl">
              S/ {Number(pedido.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-4 flex gap-3">
          <Link
            href="/"
            className="flex-1 bg-surface border border-line hover:border-brand text-gray-300 font-bold py-3 rounded-xl text-center transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            href="/mis-pedidos"
            className="flex-1 bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-xl text-center transition-colors"
          >
            Ver mis pedidos
          </Link>
        </div>
      </main>

      <BottomNav />
    </>
  )
}
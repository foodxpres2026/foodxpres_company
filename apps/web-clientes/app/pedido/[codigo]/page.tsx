import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import EstadoTimeline from '@/components/pedidos/estado-timeline'

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

async function getPedido(codigo: string, usuarioId: string) {
  const pedidoRows = (await sql`
    SELECT id, codigo, subtotal, total_envio, propina, vip, costo_vip,
           total, notas, estado_global, creado_en
    FROM pedidos
    WHERE codigo = ${codigo} AND usuario_id = ${usuarioId}
    LIMIT 1
  `) as any[]

  if (pedidoRows.length === 0) return null
  const pedido = pedidoRows[0]

  const subs = (await sql`
    SELECT 
      sp.id, sp.estado, sp.subtotal, sp.costo_envio, sp.distancia_km,
      sp.direccion_snapshot, sp.notas,
      sp.creado_en, sp.aceptado_en, sp.listo_en, sp.recogido_en, sp.entregado_en,
      r.nombre as restaurante_nombre,
      r.celular as restaurante_celular,
      d.nombre as driver_nombre,
      d.celular as driver_celular
    FROM sub_pedidos sp
    INNER JOIN restaurantes r ON r.id = sp.restaurante_id
    LEFT JOIN usuarios d ON d.id = sp.driver_id
    WHERE sp.pedido_id = ${pedido.id}
    ORDER BY sp.creado_en ASC
  `) as any[]

  const subsConItems = await Promise.all(
    subs.map(async (sp: any) => {
      const items = (await sql`
        SELECT id, nombre_snapshot, precio_snapshot, cantidad, subtotal, notas
        FROM pedido_items
        WHERE sub_pedido_id = ${sp.id}
        ORDER BY id
      `) as any[]

      const itemsConOpciones = await Promise.all(
        items.map(async (item: any) => {
          const opciones = (await sql`
            SELECT grupo_titulo_snapshot, choice_nombre_snapshot, precio_extra
            FROM item_opciones
            WHERE item_id = ${item.id}
          `) as any[]
          return { ...item, opciones }
        })
      )

      return { ...sp, items: itemsConOpciones }
    })
  )

  return { ...pedido, sub_pedidos: subsConItems }
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

  // Dirección para header
  const dirRows = (await sql`
    SELECT id, etiqueta, direccion, referencia, lat, lng
    FROM direcciones
    WHERE usuario_id = ${user.id} AND es_predeterminada = TRUE
    LIMIT 1
  `) as any[]

  const direccionDeBD = dirRows[0] || null

  return (
    <>
      <Header user={user} direccionDeBD={direccionDeBD} />

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24 md:pb-8">
        {/* HEADER */}
        <div className="mb-5">
          <Link
            href="/mis-pedidos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand transition-colors mb-3"
          >
            <span>←</span>
            <span>Volver a mis pedidos</span>
          </Link>
          <h1 className="text-2xl font-black text-white">
            Pedido {pedido.codigo}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(pedido.creado_en).toLocaleString('es-PE', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* TIMELINE GLOBAL */}
        <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
          <EstadoTimeline estado={pedido.estado_global} />
        </div>

        {/* ESTADO POR LOCAL */}
        <div className="space-y-3 mb-4">
          {pedido.sub_pedidos.map((sp: any, idx: number) => (
            <div
              key={sp.id}
              className="bg-surface border border-line rounded-2xl overflow-hidden"
            >
              {/* Header local */}
              <div className="p-4 border-b border-line">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {pedido.sub_pedidos.length > 1 && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">
                          Local {idx + 1}/{pedido.sub_pedidos.length}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm truncate">
                      🏪 {sp.restaurante_nombre}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    S/ {Number(sp.subtotal).toFixed(2)}
                  </span>
                </div>

                {/* Timeline del local */}
                <EstadoTimeline estado={sp.estado} />
              </div>

              {/* Driver si está asignado */}
              {sp.driver_nombre && (
                <div className="p-4 border-b border-line">
                  <div className="flex items-center gap-3 p-3 bg-surface-dark rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold flex-shrink-0">
                      {sp.driver_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Tu repartidor</p>
                      <p className="text-sm font-bold text-white truncate">
                        {sp.driver_nombre}
                      </p>
                    </div>
                    {sp.driver_celular && (
                      <a
                        href={`tel:+51${sp.driver_celular}`}
                        className="text-xs bg-brand hover:bg-brand-dark text-black font-bold px-3 py-2 rounded-lg flex-shrink-0 transition-colors"
                      >
                        📞 Llamar
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">
                  Items ({sp.items.length})
                </p>
                <div className="space-y-2">
                  {sp.items.map((item: any) => (
                    <div key={item.id} className="flex gap-2 text-xs">
                      <span className="font-bold text-brand flex-shrink-0">
                        {item.cantidad}×
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">
                          {item.nombre_snapshot}
                        </p>
                        {item.opciones.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {item.opciones
                              .map((o: any) => o.choice_nombre_snapshot)
                              .join(' · ')}
                          </p>
                        )}
                        {item.notas && (
                          <p className="text-[10px] text-yellow-500 mt-0.5">
                            📝 {item.notas}
                          </p>
                        )}
                      </div>
                      <span className="text-white font-bold flex-shrink-0">
                        S/ {Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RESUMEN */}
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-2 text-sm">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
            Resumen del pago
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

        {/* Botón */}
        <Link
          href="/"
          className="block mt-4 text-center bg-surface border border-line hover:border-brand text-gray-300 font-bold py-3 rounded-xl transition-colors"
        >
          Volver al inicio
        </Link>
      </main>

      <BottomNav />
    </>
  )
}
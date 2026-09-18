'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCarrito } from '@/lib/carrito/store'
import { useDireccionActual, type DireccionLocal } from '@/hooks/use-direccion-actual'

interface Props {
  estaLogueado: boolean
  direccionDeBD: DireccionLocal | null
  costoVip: number
}

const PROPINAS = [
  { label: 'Sin propina', value: 0 },
  { label: '+S/ 1', value: 1 },
  { label: '+S/ 2', value: 2 },
  { label: '+S/ 3', value: 3 },
]

export default function CarritoCliente({
  estaLogueado,
  direccionDeBD,
  costoVip,
}: Props) {
  const router = useRouter()
  const items = useCarrito((s) => s.items)
  const cambiarCantidad = useCarrito((s) => s.cambiarCantidad)
  const eliminar = useCarrito((s) => s.eliminar)
  const vaciar = useCarrito((s) => s.vaciar)

  // 🎯 Ahora usa directamente la dirección (BD o localStorage)
  const direccionActual = useDireccionActual(direccionDeBD)

  const [enviosPorLocal, setEnviosPorLocal] = useState<
    Record<string, number>
  >({})
  const [propina, setPropina] = useState(0)
  const [otraPropina, setOtraPropina] = useState('')
  const [esOtraPropina, setEsOtraPropina] = useState(false)
  const [vip, setVip] = useState(false)
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Agrupar items por restaurante
  const grupos = items.reduce<
    Record<
      string,
      {
        restaurante_id: string
        restaurante_nombre: string
        restaurante_slug: string
        items: typeof items
      }
    >
  >((acc, item) => {
    const key = item.restaurante_id
    if (!acc[key]) {
      acc[key] = {
        restaurante_id: item.restaurante_id,
        restaurante_nombre: item.restaurante_nombre,
        restaurante_slug: item.restaurante_slug,
        items: [],
      }
    }
    acc[key].items.push(item)
    return acc
  }, {})

  const gruposArr = Object.values(grupos)

  // ============================================
  // Calcular envíos cuando hay dirección + items
  // ============================================
  useEffect(() => {
    if (!direccionActual?.lat || !direccionActual?.lng) {
      setEnviosPorLocal({})
      return
    }
    if (items.length === 0) {
      setEnviosPorLocal({})
      return
    }

    const ids = [...new Set(items.map((i) => i.restaurante_id))]

    console.log('Calculando envíos:', { ids, lat: direccionActual.lat, lng: direccionActual.lng })

    fetch('/api/envio/calcular-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurante_ids: ids,
        lat: direccionActual.lat,
        lng: direccionActual.lng,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log('Respuesta envíos:', data)
        if (data.ok) {
          const map: Record<string, number> = {}
          for (const item of data.data) {
            if (item.costo != null) {
              map[item.restaurante_id] = Number(item.costo)
            }
          }
          setEnviosPorLocal(map)
        }
      })
      .catch((err) => {
        console.error('Error envíos:', err)
        setEnviosPorLocal({})
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, direccionActual?.lat, direccionActual?.lng])

  // ============================================
  // Cálculos
  // ============================================
  const subtotal = items.reduce(
    (s, i) => s + i.precio_unitario * i.cantidad,
    0
  )
  const envioTotal = Object.values(enviosPorLocal).reduce(
    (s, v) => s + v,
    0
  )
  const vipMonto = vip ? costoVip : 0
  const total = subtotal + envioTotal + propina + vipMonto

  // ============================================
  // Confirmar pedido
  // ============================================
  async function confirmar() {
    setError(null)

    if (items.length === 0) {
      setError('Tu carrito está vacío')
      return
    }

    if (!estaLogueado) {
      router.push('/login?redirect=/carrito')
      return
    }

    if (!direccionActual?.id) {
      setError('Necesitas una dirección de entrega')
      return
    }

    setEnviando(true)

    try {
      const gruposMap = items.reduce<
        Record<
          string,
          {
            restaurante_id: string
            items: {
              plato_id: string
              nombre_snapshot: string
              precio_snapshot: number
              cantidad: number
              notas: string | null
              opciones: {
                grupo_titulo: string
                choice_nombre: string
                precio_extra: number
              }[]
            }[]
          }
        >
      >((acc, item) => {
        if (!acc[item.restaurante_id]) {
          acc[item.restaurante_id] = {
            restaurante_id: item.restaurante_id,
            items: [],
          }
        }
        const extras = item.opciones.reduce((s, o) => s + o.precio_extra, 0)
        acc[item.restaurante_id].items.push({
          plato_id: item.plato_id,
          nombre_snapshot: item.plato_nombre,
          precio_snapshot: item.precio_unitario - extras,
          cantidad: item.cantidad,
          notas: item.notas,
          opciones: item.opciones.map((o) => ({
            grupo_titulo: o.grupo_titulo,
            choice_nombre: o.choice_nombre,
            precio_extra: o.precio_extra,
          })),
        })
        return acc
      }, {})

      const gruposPayload = Object.values(gruposMap)

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direccion_id: direccionActual.id,
          propina,
          vip,
          notas: notas.trim() || null,
          grupos: gruposPayload,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al crear pedido')
        setEnviando(false)
        return
      }

      vaciar()
      router.push(`/pedido/${data.data.codigo}`)
    } catch {
      setError('Error de conexión')
      setEnviando(false)
    }
  }

  // ============================================
  // CARRITO VACÍO
  // ============================================
  if (items.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-12 text-center">
        <p className="text-5xl mb-3">🛒</p>
        <h2 className="font-bold text-white text-lg mb-1">
          Tu carrito está vacío
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Agrega platos de tus restaurantes favoritos
        </p>
        <Link
          href="/"
          className="inline-block bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Explorar restaurantes →
        </Link>
      </div>
    )
  }

  // ============================================
  // CARRITO CON ITEMS
  // ============================================
  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden">
      {/* DIRECCIÓN */}
      <div className="p-4 border-b border-line flex items-start gap-3">
        <span className="text-base mt-0.5">📍</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
            Entregar en
          </p>
          <p className="text-sm text-white font-medium truncate">
            {direccionActual?.direccion || 'Sin dirección'}
          </p>
          {direccionActual?.referencia && (
            <p className="text-[11px] text-gray-500 truncate">
              Ref: {direccionActual.referencia}
            </p>
          )}
        </div>
        <Link
          href="/direcciones"
          className="text-xs text-brand hover:underline font-bold whitespace-nowrap flex-shrink-0"
        >
          Cambiar
        </Link>
      </div>

      {/* GRUPOS */}
      {gruposArr.map((grupo) => {
        const envio = enviosPorLocal[grupo.restaurante_id]

        return (
          <div key={grupo.restaurante_id} className="border-b border-line">
            <div className="bg-surface-dark px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">🏪</span>
                <h3 className="font-bold text-white text-xs truncate">
                  {grupo.restaurante_nombre}
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                Delivery:{' '}
                <strong className="text-brand">
                  {envio != null ? `S/ ${envio.toFixed(2)}` : 'S/ —'}
                </strong>
              </span>
            </div>

            <div className="divide-y divide-line">
              {grupo.items.map((item) => {
                const subtotalItem = item.precio_unitario * item.cantidad

                return (
                  <div key={item.id} className="p-3 flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-dark border border-line overflow-hidden flex-shrink-0">
                      {item.plato_imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.plato_imagen}
                          alt={item.plato_nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl opacity-30">
                          🍽️
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white leading-tight truncate">
                        {item.plato_nombre}
                      </h4>

                      {item.opciones.length > 0 && (
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {item.opciones.map((o) => o.choice_nombre).join(' · ')}
                        </p>
                      )}

                      {item.notas && (
                        <p className="text-[10px] text-yellow-500 truncate mt-0.5">
                          📝 {item.notas}
                        </p>
                      )}

                      <p className="text-[11px] text-gray-500 mt-1">
                        S/ {item.precio_unitario.toFixed(2)} c/u
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-surface-dark border border-line rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidad(item.id, item.cantidad - 1)
                            }
                            className="w-7 h-7 text-white font-bold hover:bg-surface-light rounded-l-lg transition-colors text-sm"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-white">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidad(item.id, item.cantidad + 1)
                            }
                            className="w-7 h-7 text-white font-bold hover:bg-surface-light rounded-r-lg transition-colors text-sm"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand text-sm">
                            S/ {subtotalItem.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => eliminar(item.id)}
                            className="text-gray-500 hover:text-danger transition-colors p-1"
                            aria-label="Eliminar"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* PROPINA */}
      <div className="p-4 border-b border-line">
        <p className="text-xs font-bold text-white mb-1">
          💰 ¿Dejas propina para el repartidor?
        </p>
        <p className="text-[10px] text-gray-500 mb-3">
          100% va para el driver
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {PROPINAS.map((op) => {
            const activo = !esOtraPropina && propina === op.value
            return (
              <button
                key={op.value}
                type="button"
                onClick={() => {
                  setEsOtraPropina(false)
                  setOtraPropina('')
                  setPropina(op.value)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activo
                    ? 'bg-brand text-black border-brand'
                    : 'bg-surface-dark text-gray-300 border-line-light hover:border-brand/40'
                }`}
              >
                {op.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setEsOtraPropina(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              esOtraPropina
                ? 'bg-brand text-black border-brand'
                : 'bg-surface-dark text-gray-300 border-line-light hover:border-brand/40'
            }`}
          >
            Otro
          </button>
        </div>

        {esOtraPropina && (
          <div className="mt-3 flex items-center bg-surface-dark border border-brand rounded-xl px-3">
            <span className="text-gray-500 font-medium text-sm">S/</span>
            <input
              type="text"
              inputMode="decimal"
              value={otraPropina}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9.]/g, '')
                setOtraPropina(clean)
                const n = parseFloat(clean)
                setPropina(isNaN(n) ? 0 : n)
              }}
              autoFocus
              placeholder="0.00"
              className="flex-1 bg-transparent py-2.5 px-2 text-white placeholder-gray-600 focus:outline-none text-sm"
            />
          </div>
        )}
      </div>

      {/* VIP */}
      <div className="p-4 border-b border-line">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={vip}
            onChange={(e) => setVip(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-yellow-500 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
              ⭐ Servicio VIP
              <span className="text-[10px] font-medium text-yellow-400">
                +S/ {costoVip.toFixed(2)}
              </span>
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Tu pedido se prioriza con el repartidor
            </p>
          </div>
        </label>
      </div>

      {/* NOTAS */}
      <div className="p-4 border-b border-line">
        <p className="text-xs font-bold text-white mb-2">
          📝 Nota para tu pedido (opcional)
        </p>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value.slice(0, 200))}
          placeholder="Ej: sin cebolla, tocar timbre 2 veces, dejar con el guardián..."
          rows={2}
          className="w-full px-3 py-2 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand resize-none text-xs"
        />
        <p className="text-[10px] text-gray-600 text-right mt-1">
          {notas.length} / 200
        </p>
      </div>

      {/* RESUMEN */}
      <div className="p-4 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-white">S/ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">
            Envío ({gruposArr.length} local{gruposArr.length === 1 ? '' : 'es'})
          </span>
          <span className="text-white">S/ {envioTotal.toFixed(2)}</span>
        </div>
        {propina > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Propina</span>
            <span className="text-white">S/ {propina.toFixed(2)}</span>
          </div>
        )}
        {vip && (
          <div className="flex justify-between">
            <span className="text-gray-400">Servicio VIP</span>
            <span className="text-yellow-400">S/ {vipMonto.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 mt-1 border-t border-line">
          <span className="font-bold text-white text-sm">Total</span>
          <span className="font-black text-brand text-lg">
            S/ {total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mx-4 mb-3 bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* BOTÓN */}
      <div className="p-4 border-t border-line bg-surface-dark">
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando}
          className="w-full bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] text-sm"
        >
          {enviando ? 'Creando pedido...' : 'Realizar pedido →'}
        </button>
      </div>
    </div>
  )
}
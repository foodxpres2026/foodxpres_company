'use client'

import { useCarrito } from '@/lib/carrito/store'

export default function CarritoSummary({
  enviosPorLocal,
  propina,
  costoVip,
  vipActivo,
  enviando,
  onConfirmar,
}: {
  enviosPorLocal: Record<string, number>
  propina: number
  costoVip: number
  vipActivo: boolean
  enviando: boolean
  onConfirmar: () => void
}) {
  const items = useCarrito((s) => s.items)

  const subtotal = items.reduce(
    (s, i) => s + i.precio_unitario * i.cantidad,
    0
  )

  const envioTotal = Object.values(enviosPorLocal).reduce(
    (s, v) => s + v,
    0
  )

  const vipActivo_monto = vipActivo ? costoVip : 0
  const total = subtotal + envioTotal + propina + vipActivo_monto

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-white text-sm uppercase tracking-wider">
        Resumen
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-white">S/ {subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">
            Delivery ({Object.keys(enviosPorLocal).length} envío
            {Object.keys(enviosPorLocal).length === 1 ? '' : 's'})
          </span>
          <span className="text-white">S/ {envioTotal.toFixed(2)}</span>
        </div>

        {propina > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Propina</span>
            <span className="text-white">S/ {propina.toFixed(2)}</span>
          </div>
        )}

        {vipActivo && (
          <div className="flex justify-between">
            <span className="text-gray-400">VIP</span>
            <span className="text-yellow-400">
              S/ {costoVip.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between pt-3 border-t border-line">
          <span className="font-bold text-white">Total</span>
          <span className="font-black text-brand text-xl">
            S/ {total.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirmar}
        disabled={enviando || items.length === 0}
        className="w-full bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98] mt-2"
      >
        {enviando ? 'Creando pedido...' : 'Confirmar pedido →'}
      </button>
    </div>
  )
}
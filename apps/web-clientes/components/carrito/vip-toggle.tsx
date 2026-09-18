'use client'

export default function VIPToggle({
  activo,
  onChange,
  costo,
}: {
  activo: boolean
  onChange: (v: boolean) => void
  costo: number
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        activo
          ? 'bg-yellow-500/10 border-yellow-500/40'
          : 'bg-surface border-line'
      }`}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 mt-0.5 accent-yellow-500 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm flex items-center gap-1.5">
            ⭐ Servicio VIP
            <span className="text-xs font-medium text-yellow-400">
              +S/ {costo.toFixed(2)}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tu pedido se prioriza con el repartidor
          </p>
        </div>
      </label>
    </div>
  )
}
'use client'

const PASOS = [
  { key: 'PENDIENTE', label: 'Pendiente', icon: '🕒' },
  { key: 'ACEPTADO', label: 'Preparando', icon: '👨‍🍳' },
  { key: 'LISTO', label: 'Listo', icon: '🍽️' },
  { key: 'EN_CAMINO', label: 'En camino', icon: '🛵' },
  { key: 'ENTREGADO', label: 'Entregado', icon: '✅' },
]

const ESTADOS_ESPECIALES: Record<string, { label: string; icon: string; color: string }> = {
  ENTREGA_PENDIENTE_CONFIRMACION: { label: 'Confirma que recibiste tu pedido', icon: '📦', color: 'text-brand' },
  RECHAZADO: { label: 'Rechazado', icon: '❌', color: 'text-danger' },
  CANCELADO: { label: 'Cancelado', icon: '🚫', color: 'text-gray-400' },
}

// Mapear estados legacy a la lista simplificada
function normalizar(estado: string): string {
  if (estado === 'PREPARANDO') return 'ACEPTADO'
  if (estado === 'ASIGNADO') return 'EN_CAMINO'
  return estado
}

export default function EstadoTimeline({
  estado,
  compact = false,
}: {
  estado: string
  compact?: boolean
}) {
  const estadoNorm = normalizar(estado)

  // Estado especial (rechazado/cancelado)
  if (ESTADOS_ESPECIALES[estadoNorm]) {
    const esp = ESTADOS_ESPECIALES[estadoNorm]
    return (
      <div className={`flex items-center gap-2 ${esp.color}`}>
        <span className="text-lg">{esp.icon}</span>
        <span className="font-bold text-sm">{esp.label}</span>
      </div>
    )
  }

  const indexActual = PASOS.findIndex((p) => p.key === estadoNorm)
  if (indexActual === -1) return null

  return (
    <div>
      <div className="mb-2 grid grid-cols-5" aria-hidden="true">
        {PASOS.map((paso, i) => (
          <span key={paso.key} className={`flex h-10 items-center justify-center text-[26px] transition-all sm:h-12 sm:text-3xl ${i < indexActual ? 'opacity-100' : i === indexActual ? 'order-step-icon-current' : 'opacity-60 grayscale-[35%]'}`}>
            {paso.icon}
          </span>
        ))}
      </div>
      {/* Barra de progreso */}
      <div className="relative">
        <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gray-700" />
        <div
          className="absolute left-[10%] top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-brand transition-all duration-500"
          style={{ width: `${(indexActual / (PASOS.length - 1)) * 80}%` }}
        />
        <div className="relative z-10 grid grid-cols-5 items-center">
          {PASOS.map((paso, i) => {
            const completado = i <= indexActual
            const esActual = i === indexActual

            return (
              <div key={paso.key} className="flex h-3 items-center justify-center">
                <div
                  className={`rounded-full flex-shrink-0 transition-all ${
                    compact ? 'w-2 h-2' : 'w-3 h-3'
                  } ${
                    completado
                      ? esActual
                        ? 'bg-brand ring-4 ring-brand/20'
                        : 'bg-brand'
                      : 'bg-gray-700'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Etiquetas de todas las etapas */}
      {!compact && (
        <div className="mt-2 grid grid-cols-5 gap-1">
          {PASOS.map((paso, i) => (
            <span key={paso.key} className={`text-center text-[9px] leading-tight sm:text-[10px] ${i === indexActual ? 'font-bold text-brand' : i < indexActual ? 'text-gray-300' : 'text-gray-500'}`}>
              {paso.label}
            </span>
          ))}
        </div>
      )}

      {/* Estado actual en compact */}
      {compact && (
        <p className="text-[10px] text-brand font-bold mt-1">
          {PASOS[indexActual].label}
        </p>
      )}
    </div>
  )
}

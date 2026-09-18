'use client'

const PASOS = [
  { key: 'PENDIENTE', label: 'Pendiente', icon: '⏳' },
  { key: 'ACEPTADO', label: 'Aceptado', icon: '✅' },
  { key: 'LISTO', label: 'Listo', icon: '🍽️' },
  { key: 'EN_CAMINO', label: 'En camino', icon: '🛵' },
  { key: 'ENTREGADO', label: 'Entregado', icon: '🎉' },
]

const ESTADOS_ESPECIALES: Record<string, { label: string; icon: string; color: string }> = {
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
      {/* Barra de progreso */}
      <div className="flex items-center gap-1">
        {PASOS.map((paso, i) => {
          const completado = i <= indexActual
          const esActual = i === indexActual

          return (
            <div key={paso.key} className="flex items-center flex-1">
              {/* Punto */}
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

              {/* Línea conectora */}
              {i < PASOS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    i < indexActual ? 'bg-brand' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels (solo si no es compact) */}
      {!compact && (
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-gray-600">
            {PASOS[0].label}
          </span>
          <span className="text-[10px] text-brand font-bold">
            {PASOS[indexActual].label}
          </span>
          <span className="text-[10px] text-gray-600">
            {PASOS[PASOS.length - 1].label}
          </span>
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
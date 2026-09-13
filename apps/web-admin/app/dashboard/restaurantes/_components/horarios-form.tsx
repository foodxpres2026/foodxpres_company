'use client'

const DIAS = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
] as const

export type HorarioDia = {
  dia: string
  abierto: boolean
  hora_apertura: string | null
  hora_cierre: string | null
}

export function horariosIniciales(): HorarioDia[] {
  return DIAS.map((d) => ({
    dia: d.key,
    abierto: true,
    hora_apertura: '09:00',
    hora_cierre: '22:00',
  }))
}

export default function HorariosForm({
  horarios,
  onChange,
}: {
  horarios: HorarioDia[]
  onChange: (nuevos: HorarioDia[]) => void
}) {
  function updateDia(dia: string, patch: Partial<HorarioDia>) {
    onChange(horarios.map((h) => (h.dia === dia ? { ...h, ...patch } : h)))
  }

  function toggleTodos(abierto: boolean) {
    onChange(
      horarios.map((h) => ({
        ...h,
        abierto,
        hora_apertura: abierto ? h.hora_apertura ?? '09:00' : null,
        hora_cierre: abierto ? h.hora_cierre ?? '22:00' : null,
      }))
    )
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">
            Horario de atención
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Configura los días y horas en que el local recibe pedidos
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => toggleTodos(true)}
            className="text-brand hover:underline"
          >
            Abrir todos
          </button>
          <span className="text-gray-700">|</span>
          <button
            type="button"
            onClick={() => toggleTodos(false)}
            className="text-danger hover:underline"
          >
            Cerrar todos
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {DIAS.map((d) => {
          const h = horarios.find((x) => x.dia === d.key)
          if (!h) return null

          return (
            <div
              key={d.key}
              className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 py-2.5 px-3 rounded-xl bg-surface-dark border border-line"
            >
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={h.abierto}
                  onChange={(e) =>
                    updateDia(d.key, {
                      abierto: e.target.checked,
                      hora_apertura: e.target.checked ? '09:00' : null,
                      hora_cierre: e.target.checked ? '22:00' : null,
                    })
                  }
                  className="w-5 h-5 rounded border-gray-700 accent-brand focus:ring-brand"
                />
                <span className="text-sm font-medium text-white w-24">
                  {d.label}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    h.abierto
                      ? 'bg-brand/10 text-brand'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {h.abierto ? 'Abierto' : 'Cerrado'}
                </span>
              </div>

              {h.abierto && (
                <div className="flex items-center gap-2 ml-8 md:ml-0">
                  <input
                    type="time"
                    value={h.hora_apertura || ''}
                    onChange={(e) =>
                      updateDia(d.key, { hora_apertura: e.target.value })
                    }
                    className="px-2 py-1.5 text-sm bg-surface border border-line-light rounded-lg text-white focus:outline-none focus:border-brand"
                  />
                  <span className="text-gray-600 text-xs">a</span>
                  <input
                    type="time"
                    value={h.hora_cierre || ''}
                    onChange={(e) =>
                      updateDia(d.key, { hora_cierre: e.target.value })
                    }
                    className="px-2 py-1.5 text-sm bg-surface border border-line-light rounded-lg text-white focus:outline-none focus:border-brand"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
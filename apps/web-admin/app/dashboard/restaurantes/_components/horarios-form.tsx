'use client'

import { useState } from 'react'

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
    onChange(
      horarios.map((h) => (h.dia === dia ? { ...h, ...patch } : h))
    )
  }

  function toggleTodos(abierto: boolean, apertura = '09:00', cierre = '22:00') {
    onChange(
      horarios.map((h) => ({
        ...h,
        abierto,
        hora_apertura: abierto ? apertura : null,
        hora_cierre: abierto ? cierre : null,
      }))
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Horario de atención
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Configura los días y horas en que el local recibe pedidos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleTodos(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Abrir todos
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => toggleTodos(false)}
            className="text-xs text-red-600 hover:underline"
          >
            Cerrar todos
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {DIAS.map((d) => {
          const h = horarios.find((x) => x.dia === d.key)
          if (!h) return null

          return (
            <div
              key={d.key}
              className="flex items-center gap-4 py-3"
            >
              <div className="w-28 text-sm font-medium text-gray-700">
                {d.label}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
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
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  {h.abierto ? 'Abierto' : 'Cerrado'}
                </span>
              </label>

              {h.abierto && (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.hora_apertura || ''}
                    onChange={(e) =>
                      updateDia(d.key, { hora_apertura: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <span className="text-gray-400 text-sm">a</span>
                  <input
                    type="time"
                    value={h.hora_cierre || ''}
                    onChange={(e) =>
                      updateDia(d.key, { hora_cierre: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
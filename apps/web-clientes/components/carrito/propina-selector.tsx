'use client'

import { useState } from 'react'

const OPCIONES = [
  { label: 'Sin propina', value: 0 },
  { label: '+S/ 1', value: 1 },
  { label: '+S/ 2', value: 2 },
  { label: '+S/ 3', value: 3 },
  { label: 'Otro', value: -1 },
]

export default function PropinaSelector({
  valor,
  onChange,
}: {
  valor: number
  onChange: (v: number) => void
}) {
  const [custom, setCustom] = useState('')
  const [esCustom, setEsCustom] = useState(false)

  function seleccionar(v: number) {
    if (v === -1) {
      setEsCustom(true)
      const n = parseFloat(custom)
      onChange(isNaN(n) ? 0 : n)
    } else {
      setEsCustom(false)
      setCustom('')
      onChange(v)
    }
  }

  function handleCustomChange(v: string) {
    const clean = v.replace(/[^0-9.]/g, '')
    setCustom(clean)
    const n = parseFloat(clean)
    onChange(isNaN(n) ? 0 : n)
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-white mb-2">
        💰 ¿Dejas propina para el repartidor?
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        100% va para el driver que tome tu pedido
      </p>

      <div className="flex gap-2 flex-wrap">
        {OPCIONES.map((op) => {
          const activo =
            op.value === -1
              ? esCustom
              : !esCustom && valor === op.value
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => seleccionar(op.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activo
                  ? 'bg-brand text-black border-brand'
                  : 'bg-surface-dark text-gray-300 border-line-light hover:border-brand/40'
              }`}
            >
              {op.label}
            </button>
          )
        })}
      </div>

      {esCustom && (
        <div className="mt-3 flex items-center bg-surface-dark border border-brand rounded-xl px-4">
          <span className="text-gray-500 font-medium">S/</span>
          <input
            type="text"
            inputMode="decimal"
            value={custom}
            onChange={(e) => handleCustomChange(e.target.value)}
            autoFocus
            placeholder="0.00"
            className="flex-1 bg-transparent py-3 px-2 text-white placeholder-gray-600 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
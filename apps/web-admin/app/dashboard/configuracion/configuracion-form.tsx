'use client'

import { useEffect, useState } from 'react'

interface Config {
  tarifa_base: number
  precio_por_km: number
  costo_vip: number
  monto_minimo_global: number
  tiempo_max_aceptacion: number
  actualizado_en: string
}

export default function ConfiguracionForm() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          // Postgres devuelve numeric como string → convertir a number
          setConfig({
            tarifa_base: Number(data.data.tarifa_base),
            precio_por_km: Number(data.data.precio_por_km),
            costo_vip: Number(data.data.costo_vip),
            monto_minimo_global: Number(data.data.monto_minimo_global),
            tiempo_max_aceptacion: Number(data.data.tiempo_max_aceptacion),
            actualizado_en: data.data.actualizado_en,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function guardar() {
    if (!config) return
    setGuardando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg('Configuración guardada ✅')
        setTimeout(() => setMsg(null), 3000)
      } else {
        setMsg(data.error || 'Error al guardar')
      }
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Cargando...</p>
  }
  if (!config) {
    return <p className="text-danger text-sm">Error al cargar config</p>
  }

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig({ ...config!, [key]: value })
  }

  const ejemplo = config.tarifa_base + config.precio_por_km * 3

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Envío</h3>
          <p className="text-xs text-gray-500 mt-1">
            Fórmula: tarifa base + (precio × km recorridos)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Tarifa base (S/)"
            value={config.tarifa_base}
            onChange={(v) => update('tarifa_base', v)}
          />
          <Field
            label="Precio por km (S/)"
            value={config.precio_por_km}
            onChange={(v) => update('precio_por_km', v)}
          />
        </div>

        <div className="bg-surface-dark border border-line rounded-xl p-3 text-xs text-gray-400">
          Ejemplo: 3 km → S/ {config.tarifa_base.toFixed(2)} + (
          {config.precio_por_km.toFixed(2)} × 3) = S/ {ejemplo.toFixed(2)}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Pedidos</h3>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Costo VIP (S/)"
            value={config.costo_vip}
            onChange={(v) => update('costo_vip', v)}
          />
          <Field
            label="Monto mínimo global (S/)"
            value={config.monto_minimo_global}
            onChange={(v) => update('monto_minimo_global', v)}
          />
        </div>

        <Field
          label="Tiempo máx. de aceptación (min)"
          value={config.tiempo_max_aceptacion}
          onChange={(v) => update('tiempo_max_aceptacion', v)}
          hint="Si el local no acepta en este tiempo, el pedido se cancela automáticamente"
        />
      </div>

      {msg && (
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            msg.includes('✅')
              ? 'bg-brand/10 border border-brand/30 text-brand'
              : 'bg-danger/10 border border-danger/30 text-danger'
          }`}
        >
          {msg}
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full md:w-auto bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold px-6 py-3 rounded-xl transition-colors active:scale-[0.98]"
      >
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  )
}
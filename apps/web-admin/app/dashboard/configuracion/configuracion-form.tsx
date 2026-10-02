'use client'

import { useEffect, useState } from 'react'

interface Config {
  tarifa_delivery_metodo: 'DETALLADA' | 'GENERAL'
  costo_vip: number
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
            tarifa_delivery_metodo: data.data.tarifa_delivery_metodo,
            costo_vip: Number(data.data.costo_vip),
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

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Envío</h3>
          <p className="text-xs text-gray-500 mt-1">FOODXPRES cobra según la ruta real. Los pedidos a más de 15 km no se aceptan.</p>
        </div>
        <fieldset className="space-y-3">
          <legend className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Tabla activa (elige una)</legend>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-dark p-4 cursor-pointer">
            <input type="radio" name="tarifa_delivery_metodo" checked={config.tarifa_delivery_metodo === 'DETALLADA'} onChange={() => update('tarifa_delivery_metodo', 'DETALLADA')} className="mt-1 accent-lime-500" />
            <span><strong className="block text-sm text-white">Tabla FOODXPRES detallada</strong><small className="text-gray-500">Usa los rangos y correcciones de la primera tabla (hasta 11 km); continúa el patrón de S/ 0.50 cada 0.5 km hasta 15 km.</small></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-dark p-4 cursor-pointer">
            <input type="radio" name="tarifa_delivery_metodo" checked={config.tarifa_delivery_metodo === 'GENERAL'} onChange={() => update('tarifa_delivery_metodo', 'GENERAL')} className="mt-1 accent-lime-500" />
            <span><strong className="block text-sm text-white">Tabla FOODXPRES general</strong><small className="text-gray-500">Usa los rangos de la segunda tabla (hasta 12 km); continúa el patrón de S/ 0.50 cada 0.5 km hasta 15 km.</small></span>
          </label>
        </fieldset>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Pedidos</h3>

        <Field
          label="Costo VIP (S/)"
          value={config.costo_vip}
          onChange={(v) => update('costo_vip', v)}
        />

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

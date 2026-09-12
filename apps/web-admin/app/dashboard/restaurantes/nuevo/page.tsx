'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HorariosForm, {
  horariosIniciales,
  type HorarioDia,
} from '../_components/horarios-form'

export default function NuevoRestaurantePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    slug: '',
    nombre: '',
    subtitulo: '',
    direccion_fisica: '',
    celular: '',
    tipo_socio: 'socio' as 'socio' | 'externo',
    monto_minimo: 5,
    tiempo_estimado: '',
    activo: true,
  })

  const [horarios, setHorarios] = useState<HorarioDia[]>(horariosIniciales())

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNombreChange(value: string) {
    update('nombre', value)
    if (!form.slug || form.slug === slugify(form.nombre)) {
      update('slug', slugify(value))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Crear restaurante
      const res = await fetch('/api/restaurantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al crear restaurante')
        setLoading(false)
        return
      }

      // 2. Guardar horarios
      const nuevoId = data.data.id
      const resHorarios = await fetch(
        `/api/restaurantes/${nuevoId}/horarios`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horarios }),
        }
      )

      if (!resHorarios.ok) {
        setError('Restaurante creado, pero falló guardar los horarios')
        setLoading(false)
        return
      }

      router.push('/dashboard/restaurantes')
      router.refresh()
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/restaurantes"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver a restaurantes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Nuevo restaurante
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Registra un local para que los clientes puedan pedir
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ============================
            DATOS BÁSICOS
           ============================ */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-900">
            Datos del local
          </h3>

          <Field
            label="Nombre del restaurante"
            required
            value={form.nombre}
            onChange={handleNombreChange}
            placeholder="La Burguesía"
          />

          <Field
            label="Slug (URL amigable)"
            required
            value={form.slug}
            onChange={(v) => update('slug', v)}
            placeholder="la-burguesia"
            hint="Solo minúsculas, números y guiones"
          />

          <Field
            label="Subtítulo"
            value={form.subtitulo}
            onChange={(v) => update('subtitulo', v)}
            placeholder="Hamburguesas • Papas Fritas"
          />

          <Field
            label="Dirección física"
            required
            value={form.direccion_fisica}
            onChange={(v) => update('direccion_fisica', v)}
            placeholder="Jr. Tarapacá 456, Pucallpa"
          />

          <Field
            label="Celular (9 dígitos)"
            value={form.celular}
            onChange={(v) => update('celular', v)}
            placeholder="987654321"
          />
        </div>

        {/* ============================
            CONFIGURACIÓN DE VENTA
           ============================ */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-900">
            Configuración de venta
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de socio
              </label>
              <select
                value={form.tipo_socio}
                onChange={(e) =>
                  update('tipo_socio', e.target.value as 'socio' | 'externo')
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="socio">Socio</option>
                <option value="externo">Externo</option>
              </select>
            </div>

            <Field
              label="Monto mínimo (S/)"
              type="number"
              value={String(form.monto_minimo)}
              onChange={(v) => update('monto_minimo', Number(v) || 0)}
              placeholder="5"
              hint="Por defecto S/ 5.00"
            />
          </div>

          <Field
            label="Tiempo estimado de entrega"
            value={form.tiempo_estimado}
            onChange={(v) => update('tiempo_estimado', v)}
            placeholder="25-35 min"
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="activo"
              checked={form.activo}
              onChange={(e) => update('activo', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="activo" className="text-sm text-gray-700">
              Activar desde ahora
            </label>
          </div>
        </div>

        {/* ============================
            HORARIOS
           ============================ */}
        <HorariosForm horarios={horarios} onChange={setHorarios} />

        {/* ============================
            ERROR + ACCIONES
           ============================ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creando...' : 'Crear restaurante'}
          </button>
          <Link
            href="/dashboard/restaurantes"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}

// ============================================
// COMPONENTE DE CAMPO REUTILIZABLE
// ============================================
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
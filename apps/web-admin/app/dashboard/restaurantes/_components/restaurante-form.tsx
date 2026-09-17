'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HorariosForm, {
  horariosIniciales,
  type HorarioDia,
} from './horarios-form'
import CategoriasPicker from './categorias-picker'

export interface RestauranteFormData {
  slug: string
  nombre: string
  subtitulo: string
  direccion_fisica: string
  referencia: string
  celular: string
  lat: string
  lng: string
  tiempo_estimado: string
  monto_minimo: number
  costo_envio_minimo: number | null
  banner_url: string
  logo_url: string
  activo: boolean
}

export interface RestauranteFormProps {
  mode: 'create' | 'edit'
  restauranteId?: string
  initialData?: Partial<RestauranteFormData>
  initialHorarios?: HorarioDia[]
  initialCategorias?: string[]
}

export default function RestauranteForm({
  mode,
  restauranteId,
  initialData,
  initialHorarios,
  initialCategorias = [],
}: RestauranteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<RestauranteFormData>({
    slug: initialData?.slug ?? '',
    nombre: initialData?.nombre ?? '',
    subtitulo: initialData?.subtitulo ?? '',
    direccion_fisica: initialData?.direccion_fisica ?? '',
    referencia: initialData?.referencia ?? '',
    celular: initialData?.celular ?? '',
    lat: initialData?.lat ?? '',
    lng: initialData?.lng ?? '',
    tiempo_estimado: initialData?.tiempo_estimado ?? '',
    monto_minimo: initialData?.monto_minimo ?? 5,
    costo_envio_minimo: initialData?.costo_envio_minimo ?? null,
    banner_url: initialData?.banner_url ?? '',
    logo_url: initialData?.logo_url ?? '',
    activo: initialData?.activo ?? true,
  })

  const [horarios, setHorarios] = useState<HorarioDia[]>(
    initialHorarios ?? horariosIniciales()
  )
  const [categoriaIds, setCategoriaIds] = useState<string[]>(initialCategorias)

  function update<K extends keyof RestauranteFormData>(
    key: K,
    value: RestauranteFormData[K]
  ) {
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
      const payload = {
        ...form,
        banner_url: form.banner_url || null,
        logo_url: form.logo_url || null,
        celular: form.celular || null,
        subtitulo: form.subtitulo || null,
        referencia: form.referencia || null,
        tiempo_estimado: form.tiempo_estimado || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        costo_envio_minimo: form.costo_envio_minimo ?? null,
      }

      const url =
        mode === 'create'
          ? '/api/restaurantes'
          : `/api/restaurantes/${restauranteId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al guardar')
        setLoading(false)
        return
      }

      const rid = mode === 'create' ? data.data.id : restauranteId!

      await fetch(`/api/restaurantes/${rid}/horarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarios }),
      })

      await fetch(`/api/restaurantes/${rid}/categorias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoriaIds }),
      })

      router.push('/dashboard/restaurantes')
      router.refresh()
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {/* DATOS BÁSICOS */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Datos del local</h3>

        <Field
          label="Nombre"
          required
          value={form.nombre}
          onChange={handleNombreChange}
          placeholder="La Burguesía"
        />

        <Field
          label="Slug (URL)"
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
          placeholder="Hamburguesas artesanales"
        />

        <Field
          label="Dirección"
          required
          value={form.direccion_fisica}
          onChange={(v) => update('direccion_fisica', v)}
          placeholder="Jr. Tarapacá 456, Pucallpa"
        />

        <Field
          label="Referencia"
          value={form.referencia}
          onChange={(v) => update('referencia', v)}
          placeholder="Frente a la Plaza de Armas"
        />

        <Field
          label="Celular"
          value={form.celular}
          onChange={(v) => update('celular', v)}
          placeholder="987654321"
          hint="9 dígitos empezando con 9"
        />
      </div>

      {/* IMÁGENES */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Imágenes</h3>
          <p className="text-xs text-gray-500 mt-1">
            Pega URLs por ahora. Subida directa en el futuro.
          </p>
        </div>

        <Field
          label="URL del logo"
          value={form.logo_url}
          onChange={(v) => update('logo_url', v)}
          placeholder="https://ejemplo.com/logo.png"
        />

        <Field
          label="URL del banner"
          value={form.banner_url}
          onChange={(v) => update('banner_url', v)}
          placeholder="https://ejemplo.com/banner.jpg"
        />
      </div>

      {/* UBICACIÓN */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Ubicación GPS</h3>
          <p className="text-xs text-gray-500 mt-1">
            Necesario para calcular el envío por distancia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Latitud"
            value={form.lat}
            onChange={(v) => update('lat', v)}
            placeholder="-8.3791"
          />
          <Field
            label="Longitud"
            value={form.lng}
            onChange={(v) => update('lng', v)}
            placeholder="-74.5539"
          />
        </div>
      </div>

      {/* CONFIGURACIÓN DE VENTA */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Configuración de venta</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Monto mínimo del pedido (S/)"
            type="number"
            value={String(form.monto_minimo)}
            onChange={(v) => update('monto_minimo', Number(v) || 0)}
            placeholder="5"
            hint="Mínimo de productos para poder pedir"
          />
          <Field
            label="Tiempo estimado de preparación"
            value={form.tiempo_estimado}
            onChange={(v) => update('tiempo_estimado', v)}
            placeholder="25-35 min"
          />
        </div>

        {/* ✨ ENVÍO PERSONALIZADO */}
        <div className="bg-surface-dark border border-line-light rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="envio-personalizado"
              checked={form.costo_envio_minimo !== null}
              onChange={(e) => {
                if (e.target.checked) {
                  update('costo_envio_minimo', 7)
                } else {
                  update('costo_envio_minimo', null)
                }
              }}
              className="w-5 h-5 rounded border-gray-700 accent-brand focus:ring-brand"
            />
            <label
              htmlFor="envio-personalizado"
              className="text-sm font-medium text-white cursor-pointer flex-1"
            >
              🛵 Personalizar mínimo de envío
            </label>
          </div>

          {form.costo_envio_minimo !== null ? (
            <>
              <input
                type="number"
                step="0.50"
                min="0"
                value={form.costo_envio_minimo}
                onChange={(e) =>
                  update('costo_envio_minimo', Number(e.target.value) || 0)
                }
                className="w-full px-4 py-3 bg-surface border border-brand rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="7.00"
              />
              <p className="text-xs text-brand">
                Este local cobrará mínimo S/ {form.costo_envio_minimo.toFixed(2)}{' '}
                de envío
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              💡 Se usa el mínimo global configurado en{' '}
              <strong className="text-gray-400">Configuración</strong>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="activo"
            checked={form.activo}
            onChange={(e) => update('activo', e.target.checked)}
            className="w-5 h-5 rounded border-gray-700 accent-brand focus:ring-brand"
          />
          <label htmlFor="activo" className="text-sm text-gray-300">
            Activo (visible para clientes)
          </label>
        </div>
      </div>

      {/* HORARIOS */}
      <HorariosForm horarios={horarios} onChange={setHorarios} />

      {/* CATEGORÍAS */}
      <CategoriasPicker
        seleccionadas={categoriaIds}
        onChange={setCategoriaIds}
      />

      {/* ERROR + ACCIONES */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 sticky bottom-0 md:static bg-surface-dark md:bg-transparent pt-4 md:pt-0 -mx-5 md:mx-0 px-5 md:px-0 pb-4 md:pb-0 border-t md:border-t-0 border-line">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold px-6 py-3 rounded-xl transition-colors active:scale-[0.98]"
        >
          {loading
            ? 'Guardando...'
            : mode === 'create'
            ? 'Crear restaurante'
            : 'Guardar cambios'}
        </button>
        <Link
          href="/dashboard/restaurantes"
          className="bg-surface-light hover:bg-[#222] text-gray-300 font-medium px-6 py-3 rounded-xl transition-colors text-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}

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
      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
      />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
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
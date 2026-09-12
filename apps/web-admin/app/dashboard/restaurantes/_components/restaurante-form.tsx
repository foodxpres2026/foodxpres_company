'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HorariosForm, { horariosIniciales, type HorarioDia } from './horarios-form'
import CategoriasPicker from './categorias-picker'
import TagsPicker from './tags-picker'

export interface RestauranteFormData {
  slug: string
  nombre: string
  subtitulo: string
  direccion_fisica: string
  celular: string
  tipo_socio: 'socio' | 'externo'
  monto_minimo: number
  tiempo_estimado: string
  imagen_url: string
  logo_url: string
  lat: string
  lng: string
  activo: boolean
}

export interface RestauranteFormProps {
  mode: 'create' | 'edit'
  restauranteId?: string
  initialData?: Partial<RestauranteFormData>
  initialHorarios?: HorarioDia[]
  initialCategorias?: string[]
  initialTags?: string[]
}

export default function RestauranteForm({
  mode,
  restauranteId,
  initialData,
  initialHorarios,
  initialCategorias = [],
  initialTags = [],
}: RestauranteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<RestauranteFormData>({
    slug: initialData?.slug ?? '',
    nombre: initialData?.nombre ?? '',
    subtitulo: initialData?.subtitulo ?? '',
    direccion_fisica: initialData?.direccion_fisica ?? '',
    celular: initialData?.celular ?? '',
    tipo_socio: initialData?.tipo_socio ?? 'socio',
    monto_minimo: initialData?.monto_minimo ?? 5,
    tiempo_estimado: initialData?.tiempo_estimado ?? '',
    imagen_url: initialData?.imagen_url ?? '',
    logo_url: initialData?.logo_url ?? '',
    lat: initialData?.lat ?? '',
    lng: initialData?.lng ?? '',
    activo: initialData?.activo ?? true,
  })

  const [horarios, setHorarios] = useState<HorarioDia[]>(
    initialHorarios ?? horariosIniciales()
  )
  const [categoriaIds, setCategoriaIds] = useState<string[]>(initialCategorias)
  const [tagIds, setTagIds] = useState<string[]>(initialTags)

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
        imagen_url: form.imagen_url || null,
        logo_url: form.logo_url || null,
        celular: form.celular || null,
        subtitulo: form.subtitulo || null,
        tiempo_estimado: form.tiempo_estimado || null,
      }

      // 1. Crear o actualizar restaurante
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
        setError(data.error || 'Error al guardar restaurante')
        setLoading(false)
        return
      }

      const rid = mode === 'create' ? data.data.id : restauranteId!

      // 2. Guardar horarios
      const rHorarios = await fetch(`/api/restaurantes/${rid}/horarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarios }),
      })
      if (!rHorarios.ok) {
        setError('Guardado parcial: horarios fallaron')
        setLoading(false)
        return
      }

      // 3. Guardar categorías
      const rCat = await fetch(`/api/restaurantes/${rid}/categorias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoriaIds }),
      })
      if (!rCat.ok) {
        setError('Guardado parcial: categorías fallaron')
        setLoading(false)
        return
      }

      // 4. Guardar tags
      const rTags = await fetch(`/api/restaurantes/${rid}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds }),
      })
      if (!rTags.ok) {
        setError('Guardado parcial: etiquetas fallaron')
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* DATOS BÁSICOS */}
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

      {/* IMÁGENES (por ahora URLs) */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Imágenes</h3>
        <p className="text-xs text-gray-500 -mt-3">
          Por ahora pega URLs. La subida de archivos la agregamos después.
        </p>

        <Field
          label="URL del logo"
          value={form.logo_url}
          onChange={(v) => update('logo_url', v)}
          placeholder="https://ejemplo.com/logo.png"
        />

        <Field
          label="URL de la imagen de portada"
          value={form.imagen_url}
          onChange={(v) => update('imagen_url', v)}
          placeholder="https://ejemplo.com/portada.jpg"
        />
      </div>

      {/* UBICACIÓN */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900">
          Ubicación GPS
        </h3>
        <p className="text-xs text-gray-500 -mt-3">
          Opcional. Útil para calcular el costo de envío por distancia.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Latitud"
            type="text"
            value={form.lat}
            onChange={(v) => update('lat', v)}
            placeholder="-8.3791"
          />
          <Field
            label="Longitud"
            type="text"
            value={form.lng}
            onChange={(v) => update('lng', v)}
            placeholder="-74.5539"
          />
        </div>
      </div>

      {/* CONFIGURACIÓN DE VENTA */}
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

      {/* TAGS */}
      <TagsPicker seleccionados={tagIds} onChange={setTagIds} />

      {/* ERROR + ACCIONES */}
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
          {loading
            ? 'Guardando...'
            : mode === 'create'
            ? 'Crear restaurante'
            : 'Guardar cambios'}
        </button>
        <Link
          href="/dashboard/restaurantes"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}

// ============================================
// COMPONENTES AUXILIARES
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
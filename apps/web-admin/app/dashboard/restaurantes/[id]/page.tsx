import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import RestauranteForm, {
  type RestauranteFormData,
} from '../_components/restaurante-form'
import { type HorarioDia } from '../_components/horarios-form'

const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const

async function getData(id: string) {
  const rows = await sql`
    SELECT id, slug, nombre, subtitulo, direccion_fisica, referencia,
           celular, lat, lng, tiempo_estimado, monto_minimo,
           banner_url, logo_url, activo
    FROM restaurantes
    WHERE id = ${id}
    LIMIT 1
  `

  if (rows.length === 0) return null
  const restaurante = rows[0] as any

  const horariosRows = await sql`
    SELECT dia, hora_apertura, hora_cierre
    FROM horarios_atencion
    WHERE restaurante_id = ${id}
  `

  const map = new Map<string, { apertura: string | null; cierre: string | null }>()
  for (const h of horariosRows as any[]) {
    map.set(h.dia, { apertura: h.hora_apertura, cierre: h.hora_cierre })
  }

  const horarios: HorarioDia[] = DIAS.map((dia) => {
    const h = map.get(dia)
    const abierto = !!h?.apertura && !!h?.cierre
    return {
      dia,
      abierto,
      hora_apertura: h?.apertura ?? null,
      hora_cierre: h?.cierre ?? null,
    }
  })

  const categoriasRows = await sql`
    SELECT categoria_id FROM restaurantes_categorias
    WHERE restaurante_id = ${id}
  `
  const categoriaIds = (categoriasRows as any[]).map((r) => r.categoria_id)

  return { restaurante, horarios, categoriaIds }
}

export default async function EditarRestaurantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { restaurante, horarios, categoriaIds } = data

  const initialData: Partial<RestauranteFormData> = {
    slug: restaurante.slug,
    nombre: restaurante.nombre,
    subtitulo: restaurante.subtitulo ?? '',
    direccion_fisica: restaurante.direccion_fisica ?? '',
    referencia: restaurante.referencia ?? '',
    celular: restaurante.celular ?? '',
    lat: restaurante.lat ? String(restaurante.lat) : '',
    lng: restaurante.lng ? String(restaurante.lng) : '',
    tiempo_estimado: restaurante.tiempo_estimado ?? '',
    monto_minimo: Number(restaurante.monto_minimo),
    banner_url: restaurante.banner_url ?? '',
    logo_url: restaurante.logo_url ?? '',
    activo: restaurante.activo,
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl bg-surface-dark min-h-full">
      <div className="mb-6">
        <Link
          href="/dashboard/restaurantes"
          className="text-sm text-gray-500 hover:text-brand"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">
          {restaurante.nombre}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Editar restaurante</p>
      </div>

      <RestauranteForm
        mode="edit"
        restauranteId={restaurante.id}
        initialData={initialData}
        initialHorarios={horarios}
        initialCategorias={categoriaIds}
      />
    </div>
  )
}
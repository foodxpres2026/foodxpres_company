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
    SELECT id, slug, nombre, subtitulo, direccion_fisica, celular,
           tipo_socio, monto_minimo, tiempo_estimado,
           imagen_url, logo_url, lat, lng, activo
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

  const mapHorarios = new Map<
    string,
    { apertura: string | null; cierre: string | null }
  >()
  for (const h of horariosRows as any[]) {
    mapHorarios.set(h.dia, {
      apertura: h.hora_apertura,
      cierre: h.hora_cierre,
    })
  }

  const horarios: HorarioDia[] = DIAS.map((dia) => {
    const h = mapHorarios.get(dia)
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

  const tagsRows = await sql`
    SELECT tag_id FROM restaurantes_tags
    WHERE restaurante_id = ${id}
  `
  const tagIds = (tagsRows as any[]).map((r) => r.tag_id)

  return {
    restaurante,
    horarios,
    categoriaIds,
    tagIds,
  }
}

export default async function EditarRestaurantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getData(id)

  if (!data) notFound()

  const { restaurante, horarios, categoriaIds, tagIds } = data

  const initialData: Partial<RestauranteFormData> = {
    slug: restaurante.slug,
    nombre: restaurante.nombre,
    subtitulo: restaurante.subtitulo ?? '',
    direccion_fisica: restaurante.direccion_fisica ?? '',
    celular: restaurante.celular ?? '',
    tipo_socio: restaurante.tipo_socio,
    monto_minimo: Number(restaurante.monto_minimo),
    tiempo_estimado: restaurante.tiempo_estimado ?? '',
    imagen_url: restaurante.imagen_url ?? '',
    logo_url: restaurante.logo_url ?? '',
    lat: restaurante.lat ? String(restaurante.lat) : '',
    lng: restaurante.lng ? String(restaurante.lng) : '',
    activo: restaurante.activo,
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
          {restaurante.nombre}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Edita los datos del local
        </p>
      </div>

      <RestauranteForm
        mode="edit"
        restauranteId={restaurante.id}
        initialData={initialData}
        initialHorarios={horarios}
        initialCategorias={categoriaIds}
        initialTags={tagIds}
      />
    </div>
  )
}
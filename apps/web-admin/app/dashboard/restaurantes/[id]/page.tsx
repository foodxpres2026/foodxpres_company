import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import RestauranteForm, {
  type RestauranteFormData,
} from '../_components/restaurante-form'
import { type HorarioDia } from '../_components/horarios-form'
import CuentaLocalForm from '../_components/cuenta-local-form'

const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const

async function getData(id: string) {
  const rows = await sql`
    SELECT id, slug, nombre, subtitulo, direccion_fisica, referencia, usuario_id,
           celular, lat, lng, tiempo_estimado, monto_minimo,
           costo_envio_minimo,
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

  const cuentaRows = await sql`
    SELECT u.email
    FROM usuarios u
    WHERE u.role = 'STAFF'
      AND (u.restaurante_id = ${id} OR u.id = ${restaurante.usuario_id})
    ORDER BY (u.restaurante_id = ${id}) DESC NULLS LAST
    LIMIT 1
  `

  return { restaurante, horarios, categoriaIds, emailCuenta: String((cuentaRows[0] as any)?.email ?? '') }
}

export default async function EditarRestaurantePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { restaurante, horarios, categoriaIds, emailCuenta } = data

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
    costo_envio_minimo: restaurante.costo_envio_minimo !== null
      ? Number(restaurante.costo_envio_minimo)
      : null,
    banner_url: restaurante.banner_url ?? '',
    logo_url: restaurante.logo_url ?? '',
    activo: restaurante.activo,
  }

  return (
    <div className="space-y-6">
      <RestauranteForm
        mode="edit"
        restauranteId={restaurante.id}
        initialData={initialData}
        initialHorarios={horarios}
        initialCategorias={categoriaIds}
      />
      <CuentaLocalForm restauranteId={restaurante.id} emailInicial={emailCuenta} />
    </div>
  )
}

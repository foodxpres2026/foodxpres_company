import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import FondoDecorativo from '@/components/home/fondo-decorativo'
import PromoCarousel from '@/components/home/promo-carousel'
import CategoriasChips from '@/components/home/categorias-chips'
import HomeRestaurantes from '@/components/home/home-restaurantes'
import { estaAbierto, type HorarioDia } from '@/lib/horarios/esta-abierto'
import { SkeletonRestaurante } from '@/components/ui/skeleton'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

async function getData(categoriaSlug?: string) {
  const restaurantesRows = (await sql`
    SELECT 
      r.id, r.slug, r.nombre, r.subtitulo, r.banner_url, r.logo_url,
      r.tiempo_estimado, r.monto_minimo,
      r.activo, r.creado_en, r.orden_inicio,
      COALESCE((
        SELECT json_agg(
          jsonb_build_object('id', c.id, 'nombre', c.nombre, 'emoji', c.emoji)
          ORDER BY c.orden, c.nombre
        )
        FROM restaurantes_categorias rc
        INNER JOIN categorias c ON c.id = rc.categoria_id
        WHERE rc.restaurante_id = r.id
      ), '[]'::json) AS categorias,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'dia', h.dia,
            'hora_apertura', h.hora_apertura,
            'hora_cierre', h.hora_cierre
          )
        ) FILTER (WHERE h.id IS NOT NULL),
        '[]'::json
      ) as horarios
    FROM restaurantes r
    LEFT JOIN horarios_atencion h ON h.restaurante_id = r.id
    WHERE r.activo = TRUE
      ${
        categoriaSlug
          ? sql`AND EXISTS (
              SELECT 1 FROM restaurantes_categorias rc2
              INNER JOIN categorias c2 ON c2.id = rc2.categoria_id
              WHERE rc2.restaurante_id = r.id AND c2.slug = ${categoriaSlug}
            )`
          : sql``
      }
    GROUP BY r.id
    ORDER BY r.orden_inicio ASC, r.creado_en DESC
  `) as any[]

  const categorias = (await sql`
    SELECT id, slug, nombre, emoji FROM categorias ORDER BY orden, nombre
  `) as any[]

  const promos = await sql`
    SELECT id, badge, titulo, subtitulo, cta_texto, imagen_url, gradiente_css, link_url
    FROM promociones
    WHERE activo = TRUE
    ORDER BY orden
    LIMIT 5
  `

  const restaurantes = restaurantesRows.map((r) => ({
    ...r,
    categorias: Array.isArray(r.categorias) ? r.categorias : [],
    horarios: r.horarios || [],
    abierto: estaAbierto(r.horarios || []),
  }))

  restaurantes.sort((a, b) => {
    if (a.abierto && !b.abierto) return -1
    if (!a.abierto && b.abierto) return 1
    const orden = Number(a.orden_inicio ?? 0) - Number(b.orden_inicio ?? 0)
    if (orden !== 0) return orden
    return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
  })

  return { restaurantes, categorias, promos }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const params = await searchParams
  const categoriaActiva = params.categoria

  const user = await getSessionUser()
  const { restaurantes, categorias, promos } = await getData(categoriaActiva)

  let direccionDeBD = null
  if (user) {
    const dirRows = (await sql`
      SELECT id, etiqueta, direccion, referencia, lat, lng
      FROM direcciones
      WHERE usuario_id = ${user.id} AND es_predeterminada = TRUE
      LIMIT 1
    `) as any[]
    direccionDeBD = dirRows[0] || null
  }

  const abiertos = restaurantes.filter((r) => r.abierto)
  const masPedidos = abiertos.slice(2, 6)

  return (
    <>
      <FondoDecorativo />
      <Header user={user} direccionDeBD={direccionDeBD} categoriasBusqueda={categorias} />

      <main className="max-w-6xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <section className="mb-6">
          <PromoCarousel promos={promos as any[]} />
        </section>

        <section className="mb-3">
          <h2 className="text-base font-bold text-white mb-3">
            ¿Qué se te antoja? 🤔
          </h2>
        </section>

        <div className="sticky top-[57px] z-30 -mx-4 px-4 py-2 mb-6 bg-surface-dark/95 backdrop-blur-lg border-b border-line">
          <CategoriasChips categorias={categorias as any[]} />
        </div>

        {categoriaActiva && (
          <div className="mb-4">
            <a
              href="/"
              className="text-xs text-brand hover:underline inline-flex items-center gap-1"
            >
              ← Quitar filtro
            </a>
          </div>
        )}

        <Suspense
          fallback={
            <div className="space-y-8">
              <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SkeletonRestaurante />
                  <SkeletonRestaurante />
                  <SkeletonRestaurante />
                  <SkeletonRestaurante />
                </div>
              </section>
            </div>
          }
        >
          <HomeRestaurantes
            abiertos={abiertos as any[]}
            masPedidos={masPedidos as any[]}
            todos={restaurantes as any[]}
            categoriaActiva={categoriaActiva}
            direccionDeBD={direccionDeBD}
          />
        </Suspense>
      </main>

      <BottomNav />
    </>
  )
}

import Link from 'next/link'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import FondoDecorativo from '@/components/home/fondo-decorativo'
import PromoCarousel from '@/components/home/promo-carousel'
import CategoriasChips from '@/components/home/categorias-chips'
import {
  RestauranteHero,
  RestauranteGrid,
} from '@/components/home/restaurante-card'
import { estaAbierto, type HorarioDia } from '@/lib/horarios/esta-abierto'

export const dynamic = 'force-dynamic'

async function getData(categoriaSlug?: string) {
  // Restaurantes con horarios y categorías
  const restaurantesRows = await sql`
    SELECT 
      r.id, r.slug, r.nombre, r.subtitulo, r.banner_url, r.logo_url,
      r.calificacion, r.num_resenas, r.tiempo_estimado, r.monto_minimo,
      r.activo, r.creado_en,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'dia', h.dia,
            'hora_apertura', h.hora_apertura,
            'hora_cierre', h.hora_cierre
          )
        ) FILTER (WHERE h.id IS NOT NULL),
        '[]'::json
      ) as horarios,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'slug', c.slug,
            'nombre', c.nombre,
            'emoji', c.emoji
          )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      ) as categorias
    FROM restaurantes r
    LEFT JOIN horarios_atencion h ON h.restaurante_id = r.id
    LEFT JOIN restaurantes_categorias rc ON rc.restaurante_id = r.id
    LEFT JOIN categorias c ON c.id = rc.categoria_id
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
    ORDER BY r.creado_en DESC
  `

  // Categorías globales
  const categorias = await sql`
    SELECT id, slug, nombre, emoji 
    FROM categorias 
    ORDER BY orden, nombre
  `

  // Promociones activas
  const promos = await sql`
    SELECT id, badge, titulo, subtitulo, cta_texto, imagen_url, gradiente_css
    FROM promociones
    WHERE activo = TRUE
    ORDER BY orden
    LIMIT 5
  `

  // Procesar restaurantes (calcular si están abiertos)
  const restaurantes = (restaurantesRows as any[]).map((r) => ({
    ...r,
    horarios: r.horarios || [],
    categorias: r.categorias || [],
    abierto: estaAbierto(r.horarios || []),
  }))

  // Ordenar: abiertos primero, luego por fecha de creación
  restaurantes.sort((a, b) => {
    if (a.abierto && !b.abierto) return -1
    if (!a.abierto && b.abierto) return 1
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
  // Leer dirección predeterminada del cliente (solo si está logueado)
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
  const { restaurantes, categorias, promos } = await getData(categoriaActiva)

  // Separar para secciones
  const abiertos = restaurantes.filter((r) => r.abierto)
  // "Más pedidos": los siguientes 4 después de los 2 del hero
  const masPedidos = abiertos.slice(2, 6)

  return (
    <>
      <FondoDecorativo />
      <Header user={user} direccionDeBD={direccionDeBD} />
      <main className="max-w-6xl mx-auto px-4 py-5 pb-24 md:pb-8">
        {/* PROMO CARRUSEL */}
        <section className="mb-6">
          <PromoCarousel promos={promos as any[]} />
        </section>

        {/* CATEGORÍAS */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">
              ¿Qué se te antoja? 🤔
            </h2>
          </div>
          <CategoriasChips categorias={categorias as any[]} />
        </section>

        {categoriaActiva && (
          <div className="mb-4">
            <Link
              href="/"
              className="text-xs text-brand hover:underline inline-flex items-center gap-1"
            >
              ← Quitar filtro
            </Link>
          </div>
        )}

        {/* SECCIÓN 1: ABIERTO AHORA (1 mobile, 2 desktop) */}
        {abiertos.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                Abierto ahora
              </h2>
              <span className="text-xs text-gray-500">
                {abiertos.length} local{abiertos.length === 1 ? '' : 'es'}
              </span>
            </div>

            {/* Mobile: solo 1 */}
            <div className="md:hidden">
              <RestauranteHero restaurante={abiertos[0] as any} />
            </div>

            {/* Desktop: 2 tarjetas lado a lado */}
            <div className="hidden md:grid grid-cols-2 gap-4">
              {abiertos.slice(0, 2).map((r) => (
                <RestauranteHero key={r.id} restaurante={r as any} />
              ))}
            </div>
          </section>
        )}

        {/* SECCIÓN 2: MÁS PEDIDOS HOY */}
        {masPedidos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              🔥 Los más pedidos hoy
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {masPedidos.map((r) => (
                <RestauranteGrid key={r.id} restaurante={r as any} />
              ))}
            </div>
          </section>
        )}

        {/* SECCIÓN 3: TODOS LOS RESTAURANTES */}
        {restaurantes.length > 0 && !categoriaActiva && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-white mb-3">
              🍽️ Todos los restaurantes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {restaurantes.map((r) => (
                <RestauranteGrid key={r.id} restaurante={r as any} />
              ))}
            </div>
          </section>
        )}

        {/* SI FILTRÓ POR CATEGORÍA → mostrar todos los resultados */}
        {categoriaActiva && restaurantes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-white mb-3">
              🎯 Resultados ({restaurantes.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {restaurantes.map((r) => (
                <RestauranteGrid key={r.id} restaurante={r as any} />
              ))}
            </div>
          </section>
        )}

        {/* SIN RESULTADOS */}
        {restaurantes.length === 0 && (
          <div className="bg-surface border border-line rounded-2xl p-12 text-center">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-gray-400">
              {categoriaActiva
                ? 'No hay restaurantes en esta categoría'
                : 'No hay restaurantes disponibles'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Vuelve pronto 🐯
            </p>
            {categoriaActiva && (
              <Link
                href="/"
                className="text-brand hover:underline text-sm mt-3 inline-block"
              >
                Ver todos los restaurantes →
              </Link>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </>
  )
}
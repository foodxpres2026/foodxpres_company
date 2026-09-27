import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import Header from '@/components/layout/header'
import BottomNav from '@/components/layout/bottom-nav'
import HeaderRestaurante from '@/components/restaurante/header-restaurante'
import SubcategoriasTabs from '@/components/restaurante/subcategorias-tabs'
import RestauranteMenu from '@/components/restaurante/restaurante-menu'
import {
  estaAbierto,
  horarioHoyTexto,
  type HorarioDia,
} from '@/lib/horarios/esta-abierto'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const rows = (await sql`
    SELECT nombre, subtitulo, banner_url, logo_url
    FROM restaurantes
    WHERE slug = ${slug} AND activo = TRUE
    LIMIT 1
  `) as {
    nombre: string
    subtitulo: string | null
    banner_url: string | null
    logo_url: string | null
  }[]

  const restaurante = rows[0]
  if (!restaurante) return { robots: { index: false, follow: true } }

  const description =
    restaurante.subtitulo?.trim() ||
    `Explora el menú de ${restaurante.nombre} y pide por delivery en Pucallpa con FoodXpres.`
  const image = restaurante.banner_url || restaurante.logo_url

  return {
    title: `${restaurante.nombre} — Menú y delivery en Pucallpa`,
    description,
    alternates: { canonical: `/restaurante/${encodeURIComponent(slug)}` },
    openGraph: {
      title: `${restaurante.nombre} | FoodXpres`,
      description,
      type: 'website',
      locale: 'es_PE',
      siteName: 'FoodXpres',
      url: `/restaurante/${encodeURIComponent(slug)}`,
      ...(image ? { images: [{ url: image, alt: restaurante.nombre }] } : {}),
    },
  }
}

async function getRestaurante(slug: string) {
  const rows = await sql`
    SELECT 
      r.id, r.slug, r.nombre, r.subtitulo, r.banner_url, r.logo_url,
      r.direccion_fisica, r.tiempo_estimado,
      r.monto_minimo, r.activo,
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
    WHERE r.slug = ${slug} AND r.activo = TRUE
    GROUP BY r.id
    LIMIT 1
  `

  if (rows.length === 0) return null
  return rows[0] as any
}

async function getMenu(restauranteId: string) {
  const subcategorias = await sql`
    SELECT id, nombre, orden
    FROM subcategorias
    WHERE restaurante_id = ${restauranteId}
    ORDER BY orden, nombre
  `

  const platos = await sql`
    SELECT 
      p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
      p.tiempo_estimado, p.disponible, p.subcategoria_id, p.orden,
      EXISTS(
        SELECT 1 FROM grupos_opciones g WHERE g.plato_id = p.id
      ) as tiene_opciones
    FROM platos p
    WHERE p.restaurante_id = ${restauranteId}
    ORDER BY p.orden, p.nombre
  `

  // Opciones por plato
  const platosConOpciones = await Promise.all(
    (platos as any[]).map(async (p) => {
      if (!p.tiene_opciones) return { ...p, grupos: [] }

      const grupos = await sql`
        SELECT id, titulo, requerido, minimo, maximo, orden
        FROM grupos_opciones
        WHERE plato_id = ${p.id}
        ORDER BY orden
      `

      const gruposConChoices = await Promise.all(
        (grupos as any[]).map(async (g) => {
          const choices = await sql`
            SELECT id, nombre, precio_extra, orden
            FROM opciones_choices
            WHERE grupo_id = ${g.id}
            ORDER BY orden
          `
          return { ...g, choices }
        })
      )

      return { ...p, grupos: gruposConChoices }
    })
  )

  return { subcategorias, platos: platosConOpciones }
}

export default async function RestaurantePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await getSessionUser()

  const restaurante = await getRestaurante(slug)
  if (!restaurante) notFound()

  const { subcategorias, platos } = await getMenu(restaurante.id)

  const abierto = estaAbierto(restaurante.horarios || [])
  const horarioHoy = horarioHoyTexto(restaurante.horarios || [])

  return (
    <>
      <Header user={user} />

      <main className="pb-24 md:pb-8">
        <HeaderRestaurante
          nombre={restaurante.nombre}
          subtitulo={restaurante.subtitulo}
          banner_url={restaurante.banner_url}
          logo_url={restaurante.logo_url}
          tiempo_estimado={restaurante.tiempo_estimado}
          monto_minimo={restaurante.monto_minimo}
          abierto={abierto}
          horarioHoy={horarioHoy}
          direccion={restaurante.direccion_fisica}
        />

        <div className="max-w-6xl mx-auto px-4 mt-6">
          {subcategorias.length > 0 && (
            <SubcategoriasTabs subcategorias={subcategorias as any[]} />
          )}

          <RestauranteMenu
            subcategorias={subcategorias as any[]}
            platos={platos as any[]}
            restaurante={{
              id: restaurante.id,
              slug: restaurante.slug,
              nombre: restaurante.nombre,
            }}
            abierto={abierto}
          />
        </div>
      </main>

      <BottomNav />
    </>
  )
}

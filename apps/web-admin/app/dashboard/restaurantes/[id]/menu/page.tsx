import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import PlatosEditor from '../../_components/platos-editor'

async function getData(restauranteId: string) {
  const platos = await sql`
    SELECT 
      p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
      p.tiempo_estimado, p.disponible, p.subcategoria_id,
      s.nombre as subcategoria_nombre,
      (
        SELECT COUNT(*)::int
        FROM grupos_opciones g
        WHERE g.plato_id = p.id
      ) as num_grupos
    FROM platos p
    LEFT JOIN subcategorias s ON s.id = p.subcategoria_id
    WHERE p.restaurante_id = ${restauranteId}
    ORDER BY s.orden NULLS LAST, p.orden, p.nombre
  `

  const subcategorias = await sql`
    SELECT id, nombre, orden
    FROM subcategorias
    WHERE restaurante_id = ${restauranteId}
    ORDER BY orden, nombre
  `

  return { platos, subcategorias }
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const rest = await sql`SELECT id FROM restaurantes WHERE id = ${id} LIMIT 1`
  if (rest.length === 0) notFound()

  const { platos, subcategorias } = await getData(id)

  return (
    <PlatosEditor
      restauranteId={id}
      initialPlatos={platos as any[]}
      subcategorias={subcategorias as any[]}
    />
  )
}
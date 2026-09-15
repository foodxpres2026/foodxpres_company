import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import SubcategoriasEditor from '../../_components/subcategorias-editor'

async function getSubcategorias(restauranteId: string) {
  return sql<{ id: string; nombre: string; orden: number }[]>`
    SELECT id, nombre, orden
    FROM subcategorias
    WHERE restaurante_id = ${restauranteId}
    ORDER BY orden, nombre
  `
}

export default async function SubcategoriasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Verificar que el restaurante existe
  const rest = await sql`SELECT id FROM restaurantes WHERE id = ${id} LIMIT 1`
  if (rest.length === 0) notFound()

  const subcategorias = await getSubcategorias(id)

  return <SubcategoriasEditor restauranteId={id} initialData={subcategorias} />
}
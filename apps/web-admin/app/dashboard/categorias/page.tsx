import { sql } from '@/lib/db'
import CategoriasEditor from './_components/categorias-editor'

export default async function CategoriasPage() {
  const categorias = (await sql`
    SELECT 
      c.id, c.slug, c.nombre, c.emoji, c.orden,
      (SELECT COUNT(*)::int FROM restaurantes_categorias 
       WHERE categoria_id = c.id) as num_restaurantes
    FROM categorias c
    ORDER BY c.orden, c.nombre
  `) as any[]

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Categorías
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Tipos de comida que los clientes usan para filtrar
        </p>
      </div>

      <CategoriasEditor initialData={categorias} />
    </div>
  )
}
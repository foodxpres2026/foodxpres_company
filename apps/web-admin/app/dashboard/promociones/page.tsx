import { sql } from '@/lib/db'
import PromocionesEditor from './_components/promociones-editor'

export default async function PromocionesPage() {
  const promos = await sql`
    SELECT id, badge, titulo, subtitulo, descripcion, cta_texto,
           imagen_url, gradiente_css, orden, activo, creado_en
    FROM promociones
    ORDER BY orden ASC, creado_en DESC
  `

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Promociones
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Banners del carrusel en la web de clientes
        </p>
      </div>

      <PromocionesEditor initialData={promos as any[]} />
    </div>
  )
}
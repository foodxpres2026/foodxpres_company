import { sql } from '@/lib/db'
import SolicitudesList from './_components/solicitudes-list'

export default async function SolicitudesPage() {
  const solicitudes = await sql`
    SELECT 
      s.id,
      s.celular,
      s.usuario_id,
      s.estado,
      s.creado_en,
      u.nombre as cliente_nombre
    FROM solicitudes_recuperacion s
    LEFT JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.estado = 'PENDIENTE'
    ORDER BY s.creado_en DESC
  `

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Solicitudes de recuperación
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Clientes que olvidaron su contraseña
        </p>
      </div>

      <SolicitudesList initialData={solicitudes as any[]} />
    </div>
  )
}
import { sql } from '@/lib/db'
import DriversEditor from './_components/drivers-editor'

interface Driver {
  id: string
  nombre: string
  celular: string
  activo: boolean
  creado_en: string
  vehiculo: string | null
  placa: string | null
  licencia: string | null
  disponible: boolean | null
  total_entregas: number
  pedidos_activos: number
}

async function getDrivers(): Promise<Driver[]> {
  return (await sql`
    SELECT 
      u.id,
      u.nombre,
      u.celular,
      u.activo,
      u.creado_en,
      d.vehiculo,
      d.placa,
      d.licencia,
      d.disponible,
      (SELECT COUNT(*)::int FROM sub_pedidos 
       WHERE driver_id = u.id AND estado = 'ENTREGADO') as total_entregas,
      (SELECT COUNT(*)::int FROM sub_pedidos 
       WHERE driver_id = u.id AND estado IN ('ASIGNADO','EN_CAMINO')) as pedidos_activos
    FROM usuarios u
    LEFT JOIN driver_detalles d ON d.usuario_id = u.id
    WHERE u.role = 'DRIVER'
    ORDER BY u.activo DESC, u.creado_en DESC
  `) as Driver[]
}

export default async function DriversPage() {
  const drivers = await getDrivers()

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Drivers</h1>
        <p className="text-gray-500 text-sm mt-1">
          {drivers.length} registrado{drivers.length === 1 ? '' : 's'}
        </p>
      </div>

      <DriversEditor initialDrivers={drivers} />
    </div>
  )
}
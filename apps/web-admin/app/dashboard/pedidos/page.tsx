import { sql } from '@/lib/db'
import PedidosKanban from './_components/pedidos-kanban'

async function getRestaurantes() {
  return (await sql`
    SELECT id, nombre FROM restaurantes
    WHERE activo = TRUE
    ORDER BY nombre
  `) as { id: string; nombre: string }[]
}

export default async function PedidosPage() {
  const restaurantes = (await getRestaurantes()) as { id: string; nombre: string }[]
  
  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Vista en tiempo real de todos los pedidos
        </p>
      </div>

      <PedidosKanban restaurantes={restaurantes} />
    </div>
  )
}
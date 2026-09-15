import { sql } from '@/lib/db'
import AdminsEditor from './_components/admins-editor'

export default async function AdminsPage() {
  const admins = await sql`
    SELECT id, email, nombre, activo, creado_en
    FROM usuarios
    WHERE role = 'ADMIN'
    ORDER BY creado_en ASC
  `

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Admins</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestiona quién tiene acceso al panel
        </p>
      </div>

      <AdminsEditor initialAdmins={admins as any[]} />
    </div>
  )
}
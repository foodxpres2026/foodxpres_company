import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const driverSchema = z.object({
  nombre: z.string().min(2).max(120),
  celular: z.string().regex(/^9\d{8}$/, 'Debe ser 9 dígitos'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  vehiculo: z.string().max(60).optional().nullable(),
  placa: z.string().max(20).optional().nullable(),
  licencia: z.string().max(40).optional().nullable(),
})

// GET → listar drivers
export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rows = await sql`
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
        d.lat_actual,
        d.lng_actual,
        (
          SELECT COUNT(*)::int FROM sub_pedidos 
          WHERE driver_id = u.id AND estado = 'ENTREGADO'
        ) as total_entregas,
        (
          SELECT COUNT(*)::int FROM sub_pedidos 
          WHERE driver_id = u.id 
            AND estado IN ('ASIGNADO','EN_CAMINO')
        ) as pedidos_activos
      FROM usuarios u
      LEFT JOIN driver_detalles d ON d.usuario_id = u.id
      WHERE u.role = 'DRIVER'
      ORDER BY u.creado_en DESC
    `
    return Response.json({ ok: true, data: rows })
  } catch (error) {
    console.error('GET drivers error:', error)
    return Response.json(
      { ok: false, error: 'Error al listar drivers' },
      { status: 500 }
    )
  }
}

// POST → crear driver
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = driverSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const d = parsed.data

    // Verificar celular único
    const exists = await sql`
      SELECT id FROM usuarios WHERE celular = ${d.celular} LIMIT 1
    `
    if (exists.length > 0) {
      return Response.json(
        { ok: false, error: 'Ya existe un usuario con ese celular' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(d.password, 10)

    // Crear usuario + detalles en transacción (via CTE)
    const inserted = await sql`
      WITH nuevo_usuario AS (
        INSERT INTO usuarios (role, celular, password_hash, nombre)
        VALUES ('DRIVER', ${d.celular}, ${passwordHash}, ${d.nombre})
        RETURNING id
      )
      INSERT INTO driver_detalles (usuario_id, vehiculo, placa, licencia, disponible)
      SELECT id, ${d.vehiculo || null}, ${d.placa || null}, ${d.licencia || null}, true
      FROM nuevo_usuario
      RETURNING usuario_id as id
    `

    return Response.json({ ok: true, data: inserted[0] }, { status: 201 })
  } catch (error) {
    console.error('POST drivers error:', error)
    return Response.json(
      { ok: false, error: 'Error al crear driver' },
      { status: 500 }
    )
  }
}
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Buscar la solicitud
    const solRows = await sql`
      SELECT celular, usuario_id, estado
      FROM solicitudes_recuperacion
      WHERE id = ${id}
      LIMIT 1
    `

    if (solRows.length === 0) {
      return Response.json(
        { ok: false, error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    const sol = solRows[0] as any

    if (sol.estado !== 'PENDIENTE') {
      return Response.json(
        { ok: false, error: 'Esta solicitud ya fue atendida' },
        { status: 400 }
      )
    }

    // Buscar usuario
    const usrRows = await sql`
      SELECT id FROM usuarios
      WHERE celular = ${sol.celular} AND role = 'CUSTOMER' AND activo = TRUE
      LIMIT 1
    `

    if (usrRows.length === 0) {
      // Marcar como cancelada (usuario no existe)
      await sql`
        UPDATE solicitudes_recuperacion
        SET estado = 'CANCELADA', 
            notas = 'No existe cliente con ese celular',
            atendido_por = ${user.id},
            atendido_en = NOW()
        WHERE id = ${id}
      `
      return Response.json(
        { ok: false, error: 'No existe cliente con ese celular' },
        { status: 404 }
      )
    }

    const usuarioId = usrRows[0].id

    // Generar contraseña temporal: 6 dígitos
    const nuevaPassword = Math.floor(100000 + Math.random() * 900000).toString()
    const hash = await bcrypt.hash(nuevaPassword, 10)

    await sql`
      UPDATE usuarios
      SET password_hash = ${hash}, actualizado_en = NOW()
      WHERE id = ${usuarioId}
    `

    // Marcar solicitud como atendida
    await sql`
      UPDATE solicitudes_recuperacion
      SET estado = 'ATENDIDA',
          atendido_por = ${user.id},
          atendido_en = NOW(),
          notas = 'Contraseña reseteada'
      WHERE id = ${id}
    `

    return Response.json({
      ok: true,
      password_temporal: nuevaPassword,
      celular: sol.celular,
      whatsapp_url: `https://wa.me/51${sol.celular}?text=${encodeURIComponent(
        `Hola! Tu nueva contraseña de FoodXpres es: ${nuevaPassword}\n\nInicia sesión y cámbiala cuando quieras. 🐯`
      )}`,
    })
  } catch (error) {
    console.error('Resetear error:', error)
    return Response.json(
      { ok: false, error: 'Error al resetear' },
      { status: 500 }
    )
  }
}
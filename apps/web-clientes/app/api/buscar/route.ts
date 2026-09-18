import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''

    if (q.length < 2) {
      return Response.json({ ok: true, data: { restaurantes: [], platos: [] } })
    }

    const term = `%${q}%`

    // ============================================
    // Buscar restaurantes
    // ============================================
    const restaurantes = (await sql`
      SELECT 
        r.id, r.slug, r.nombre, r.subtitulo, r.banner_url, r.logo_url,
        r.calificacion, r.num_resenas, r.tiempo_estimado, r.monto_minimo,
        r.activo,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'dia', h.dia,
              'hora_apertura', h.hora_apertura,
              'hora_cierre', h.hora_cierre
            )
          ) FILTER (WHERE h.id IS NOT NULL),
          '[]'::json
        ) as horarios
      FROM restaurantes r
      LEFT JOIN horarios_atencion h ON h.restaurante_id = r.id
      WHERE r.activo = TRUE
        AND (
          r.nombre ILIKE ${term}
          OR r.subtitulo ILIKE ${term}
          OR r.direccion_fisica ILIKE ${term}
        )
      GROUP BY r.id
      ORDER BY r.calificacion DESC, r.nombre ASC
      LIMIT 20
    `) as any[]

    // ============================================
    // Buscar platos
    // ============================================
    const platos = (await sql`
      SELECT 
        p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
        p.tiempo_estimado, p.disponible,
        r.id as restaurante_id,
        r.slug as restaurante_slug,
        r.nombre as restaurante_nombre,
        r.activo as restaurante_activo
      FROM platos p
      INNER JOIN restaurantes r ON r.id = p.restaurante_id
      WHERE r.activo = TRUE
        AND p.disponible = TRUE
        AND (
          p.nombre ILIKE ${term}
          OR p.descripcion ILIKE ${term}
        )
      ORDER BY p.nombre ASC
      LIMIT 30
    `) as any[]

    return Response.json({
      ok: true,
      data: { restaurantes, platos },
    })
  } catch (error) {
    console.error('Buscar error:', error)
    return Response.json(
      { ok: false, error: 'Error al buscar' },
      { status: 500 }
    )
  }
}
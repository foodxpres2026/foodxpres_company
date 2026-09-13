import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const rows = await sql`
      SELECT dia, hora_apertura, hora_cierre
      FROM horarios_atencion
      WHERE restaurante_id = ${id}
    `

    const map = new Map<string, { apertura: string | null; cierre: string | null }>()
    for (const r of rows as any[]) {
      map.set(r.dia, { apertura: r.hora_apertura, cierre: r.hora_cierre })
    }

    const horarios = DIAS.map((dia) => {
      const h = map.get(dia)
      return {
        dia,
        abierto: !!h?.apertura && !!h?.cierre,
        hora_apertura: h?.apertura ?? null,
        hora_cierre: h?.cierre ?? null,
      }
    })

    return Response.json({ ok: true, data: horarios })
  } catch (error) {
    console.error('GET horarios error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener horarios' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const horarios = body.horarios as Array<{
      dia: string
      abierto: boolean
      hora_apertura: string | null
      hora_cierre: string | null
    }>

    if (!Array.isArray(horarios)) {
      return Response.json(
        { ok: false, error: 'Formato inválido' },
        { status: 400 }
      )
    }

    await sql`DELETE FROM horarios_atencion WHERE restaurante_id = ${id}`

    for (const h of horarios) {
      if (!DIAS.includes(h.dia as any)) continue
      const apertura = h.abierto ? h.hora_apertura : null
      const cierre = h.abierto ? h.hora_cierre : null

      await sql`
        INSERT INTO horarios_atencion 
          (restaurante_id, dia, hora_apertura, hora_cierre)
        VALUES 
          (${id}, ${h.dia}, ${apertura}, ${cierre})
      `
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PUT horarios error:', error)
    return Response.json(
      { ok: false, error: 'Error al guardar horarios' },
      { status: 500 }
    )
  }
}
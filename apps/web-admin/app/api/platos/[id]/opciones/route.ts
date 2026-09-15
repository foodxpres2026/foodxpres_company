import { NextRequest } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const opcionesSchema = z.object({
  grupos: z.array(
    z.object({
      titulo: z.string().min(1).max(120),
      requerido: z.boolean().default(false),
      minimo: z.coerce.number().int().min(0).default(0),
      maximo: z.coerce.number().int().min(1).default(1),
      choices: z.array(
        z.object({
          nombre: z.string().min(1).max(80),
          precio_extra: z.coerce.number().min(0).default(0),
        })
      ),
    })
  ),
})

// GET → obtener grupos y choices de un plato
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
    const gruposRows = await sql`
      SELECT id, titulo, requerido, minimo, maximo, orden
      FROM grupos_opciones
      WHERE plato_id = ${id}
      ORDER BY orden
    `

    const grupos = await Promise.all(
      gruposRows.map(async (g: any) => {
        const choices = await sql`
          SELECT id, nombre, precio_extra, orden
          FROM opciones_choices
          WHERE grupo_id = ${g.id}
          ORDER BY orden
        `
        return {
          id: g.id,
          titulo: g.titulo,
          requerido: g.requerido,
          minimo: g.minimo,
          maximo: g.maximo,
          choices: choices.map((c: any) => ({
            id: c.id,
            nombre: c.nombre,
            precio_extra: Number(c.precio_extra),
          })),
        }
      })
    )

    return Response.json({ ok: true, data: grupos })
  } catch (error) {
    console.error('GET opciones error:', error)
    return Response.json(
      { ok: false, error: 'Error al obtener opciones' },
      { status: 500 }
    )
  }
}

// PUT → reemplazar todos los grupos y choices de un plato
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
    const parsed = opcionesSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'Datos inválidos', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    // Verificar que el plato existe
    const plato = await sql`SELECT id FROM platos WHERE id = ${id} LIMIT 1`
    if (plato.length === 0) {
      return Response.json(
        { ok: false, error: 'Plato no encontrado' },
        { status: 404 }
      )
    }

    const grupos = parsed.data.grupos

    // Borrar todos los grupos existentes (cascade borra choices)
    await sql`DELETE FROM grupos_opciones WHERE plato_id = ${id}`

    // Insertar nuevos grupos y choices
    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i]

      const grupoInserted = await sql`
        INSERT INTO grupos_opciones (plato_id, titulo, requerido, minimo, maximo, orden)
        VALUES (${id}, ${g.titulo}, ${g.requerido}, ${g.minimo}, ${g.maximo}, ${i})
        RETURNING id
      `

      const grupoId = grupoInserted[0].id

      for (let j = 0; j < g.choices.length; j++) {
        const c = g.choices[j]
        await sql`
          INSERT INTO opciones_choices (grupo_id, nombre, precio_extra, orden)
          VALUES (${grupoId}, ${c.nombre}, ${c.precio_extra}, ${j})
        `
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('PUT opciones error:', error)
    return Response.json(
      { ok: false, error: 'Error al guardar opciones' },
      { status: 500 }
    )
  }
}
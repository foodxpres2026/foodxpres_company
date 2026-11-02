import { sql } from '@/lib/db'

export async function GET() {
  try {
    const categorias = await sql`
      SELECT id, slug, nombre, emoji
      FROM categorias
      ORDER BY orden, nombre
    ` as { id: string; slug: string; nombre: string; emoji: string | null }[]

    return Response.json({ ok: true, data: categorias }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('GET categorias error:', error)
    return Response.json({ ok: false, error: 'No se pudieron cargar las categorías.' }, { status: 500 })
  }
}

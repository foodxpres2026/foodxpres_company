import { sql } from '@/lib/db'

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as now, current_database() as db`
    const tables = await sql`
      SELECT COUNT(*)::int as total
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `

    return Response.json({
      ok: true,
      database: result[0].db,
      db_time: result[0].now,
      tables_count: tables[0].total,
    })
  } catch (error) {
    console.error('Health check error:', error)
    return Response.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
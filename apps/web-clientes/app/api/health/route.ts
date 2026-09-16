import { sql } from '@/lib/db'

export async function GET() {
  try {
    const result = await sql`SELECT NOW() as now, current_database() as db`
    return Response.json({ ok: true, database: result[0].db, time: result[0].now })
  } catch (error) {
    return Response.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
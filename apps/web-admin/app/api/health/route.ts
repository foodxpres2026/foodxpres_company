import { sql } from '@/lib/db'

export async function GET() {
  try {
    await sql`SELECT 1`
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, error: 'Service unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

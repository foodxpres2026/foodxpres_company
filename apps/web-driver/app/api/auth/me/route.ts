import { getDriverSession } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getDriverSession()
    return Response.json({ ok: !!user, user }, { status: user ? 200 : 401, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, user: null }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

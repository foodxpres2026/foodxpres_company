import { logoutDriver } from '@/lib/auth'

export async function POST() {
  try {
    await logoutDriver()
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, error: 'No se pudo cerrar sesión' }, { status: 500 })
  }
}

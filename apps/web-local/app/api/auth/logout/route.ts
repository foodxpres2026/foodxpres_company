import { logoutLocal } from '@/lib/auth'

export async function POST() {
  try {
    await logoutLocal()
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, error: 'No se pudo cerrar sesión' }, { status: 500 })
  }
}

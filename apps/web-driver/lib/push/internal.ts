export async function notifyInternalPush(event: string, subOrderId: string) {
  const baseUrl = process.env.ADMIN_PUSH_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '')
  const secret = process.env.INTERNAL_PUSH_SECRET
  if (!baseUrl || !secret) {
    console.warn('Notificación omitida: configura ADMIN_PUSH_API_URL e INTERNAL_PUSH_SECRET en web-driver.')
    return
  }
  try {
    const response = await fetch(new URL('/api/internal/push', baseUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-foodxpres-internal-secret': secret },
      body: JSON.stringify({ event, subOrderId }), signal: AbortSignal.timeout(5000), cache: 'no-store',
    })
    if (!response.ok) console.error(`Notificación interna rechazada (${response.status})`)
  } catch (error) { console.error('No se pudo contactar el emisor de notificaciones:', error) }
}

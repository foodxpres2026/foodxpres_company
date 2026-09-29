import { getMessaging } from 'firebase-admin/messaging'
import { getFirebaseAdmin } from './admin'
import { sql } from '../db'

interface EnviarParams {
  usuarioId: string
  titulo: string
  mensaje: string
  url?: string
  tag?: string
  icono?: string
  data?: Record<string, string>
}

export async function enviarNotificacion(params: EnviarParams) {
  return enviarNotificacionAUsuarios([params.usuarioId], params)
}

export async function enviarNotificacionAUsuarios(
  usuarioIds: string[],
  { titulo, mensaje, url = '/', tag = 'foodxpres', icono = '/logo-mark.png', data = {} }: Omit<EnviarParams, 'usuarioId'>
): Promise<{ enviados: number; fallidos: number }> {
  try {
    const uniqueIds = [...new Set(usuarioIds.filter(Boolean))]
    if (!uniqueIds.length) return { enviados: 0, fallidos: 0 }
    const tokensRows = await sql`
      SELECT token FROM push_subscriptions
      WHERE usuario_id = ANY(${uniqueIds}::uuid[]) AND activo = TRUE
    ` as { token: string }[]
    const tokens = [...new Set(tokensRows.map((row) => row.token))]
    if (!tokens.length) return { enviados: 0, fallidos: 0 }

    const messaging = getMessaging(getFirebaseAdmin())
    const deadTokens: string[] = []
    let enviados = 0
    let fallidos = 0

    for (let start = 0; start < tokens.length; start += 500) {
      const batch = tokens.slice(start, start + 500)
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: titulo, body: mensaje },
        webpush: {
          notification: { title: titulo, body: mensaje, icon: icono, badge: icono, tag },
          data: { url, tag, ...data },
        },
      })
      enviados += result.successCount
      fallidos += result.failureCount
      result.responses.forEach((item, index) => {
        const code = item.error?.code
        const message = item.error?.message ?? ''
        const invalidToken = code === 'messaging/invalid-registration-token'
          || code === 'messaging/registration-token-not-registered'
          || (code === 'messaging/invalid-argument' && /registration token|token.*(invalid|not valid)|not a valid.*token/i.test(message))
        if (!item.success && invalidToken) deadTokens.push(batch[index])
      })
    }

    if (deadTokens.length) await sql`
      UPDATE push_subscriptions SET activo = FALSE, actualizado_en = NOW()
      WHERE token = ANY(${deadTokens}::text[])
    `
    console.log(`📬 Push enviado: ${enviados} ok, ${fallidos} fallidos`)
    return { enviados, fallidos }
  } catch (error) {
    console.error('Error enviando notificación:', error)
    return { enviados: 0, fallidos: usuarioIds.length }
  }
}

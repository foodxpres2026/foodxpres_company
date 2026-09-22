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

// ============================================================
// ENVIAR NOTIFICACIÓN PUSH A UN USUARIO
// ============================================================
export async function enviarNotificacion({
  usuarioId,
  titulo,
  mensaje,
  url = '/mis-pedidos',
  tag = 'foodxpres',
  icono = '/logo.png',
  data = {},
}: EnviarParams): Promise<{ enviados: number; fallidos: number }> {
  try {
    // 1. Traer tokens activos del usuario
    const tokensRows = (await sql`
      SELECT id, token
      FROM push_subscriptions
      WHERE usuario_id = ${usuarioId} AND activo = TRUE
    `) as any[]

    if (tokensRows.length === 0) {
      return { enviados: 0, fallidos: 0 }
    }

    const tokens = tokensRows.map((t) => t.token)

    // 2. Preparar mensaje
    const app = getFirebaseAdmin()
    const messaging = getMessaging(app)

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: titulo,
        body: mensaje,
      },
      webpush: {
        notification: {
          title: titulo,
          body: mensaje,
          icon: icono,
          badge: icono,
          tag,
        },
        fcmOptions: {
          link: url,
        },
        data: {
          url,
          tag,
          ...data,
        },
      },
    })

    // 3. Desactivar tokens que fallaron permanentemente
    const tokensMuertos: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code
        // Tokens inválidos → desactivar
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          tokensMuertos.push(tokens[idx])
        }
      }
    })

    if (tokensMuertos.length > 0) {
      await sql`
        UPDATE push_subscriptions
        SET activo = FALSE, actualizado_en = NOW()
        WHERE token = ANY(${tokensMuertos}::text[])
      `
    }

    console.log(
      `📬 Push enviado a ${usuarioId}: ${response.successCount} ok, ${response.failureCount} fallidos`
    )

    return {
      enviados: response.successCount,
      fallidos: response.failureCount,
    }
  } catch (error) {
    console.error('Error enviando notificación:', error)
    return { enviados: 0, fallidos: 0 }
  }
}
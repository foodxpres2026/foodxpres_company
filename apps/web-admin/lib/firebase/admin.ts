import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'

let app: App | null = null

export function getFirebaseAdmin(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]
    return app
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  if (!base64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 no está definida')
  }

  const serviceAccount = JSON.parse(
    Buffer.from(base64, 'base64').toString('utf-8')
  )

  app = initializeApp({
    credential: cert(serviceAccount),
  })

  return app
}
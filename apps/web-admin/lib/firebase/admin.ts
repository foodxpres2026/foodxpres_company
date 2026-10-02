import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let app: App | null = null

export function getFirebaseAdmin(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]
    return app
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  const localCredentialPath = resolve(process.cwd(), '../../backend/serviceAccountKey.json')
  // Prefer the explicitly provided local file during development. Vercel does
  // not deploy this ignored file, so production uses the Base64 environment var.
  const serviceAccount = existsSync(localCredentialPath)
    ? JSON.parse(readFileSync(localCredentialPath, 'utf8'))
    : base64
      ? JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
      : null

  if (!serviceAccount) {
    throw new Error('Configura FIREBASE_SERVICE_ACCOUNT_BASE64 o coloca backend/serviceAccountKey.json para desarrollo local')
  }
  if (serviceAccount.project_id !== 'foodxpres2026-c3168') {
    throw new Error('La cuenta de servicio no corresponde al proyecto Firebase de FOODXPRES')
  }

  app = initializeApp({
    credential: cert(serviceAccount),
  })

  return app
}

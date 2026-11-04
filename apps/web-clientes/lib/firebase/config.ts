import { initializeApp, getApps, getApp } from 'firebase/app'
import { firebaseConfig, vapidKey } from './config-values'

export { firebaseConfig, vapidKey }

// Evitar inicialización múltiple
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

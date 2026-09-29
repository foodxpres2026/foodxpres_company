import { getApp, getApps, initializeApp } from 'firebase/app'

export const firebaseConfig = {
  apiKey: 'AIzaSyCDoKTAyCJ_J1d-7DGFyNMca7-hdlUncoA',
  authDomain: 'foodxpres2026-c3168.firebaseapp.com',
  projectId: 'foodxpres2026-c3168',
  storageBucket: 'foodxpres2026-c3168.firebasestorage.app',
  messagingSenderId: '117612694174',
  appId: '1:117612694174:web:d0a4f5e8381662f731498f',
  measurementId: 'G-ZXS34PDJXT',
}

export const app = getApps().some((item) => item.name === 'foodxpres-local')
  ? getApp('foodxpres-local')
  : initializeApp(firebaseConfig, 'foodxpres-local')

export const vapidKey = 'BCnpWPWPfMaNf0XuWVDQ-BQz-JfNkCOWAJp_Nlmt5zXGzzSHXgtrUUNNBsmV3kf7BBk6GaWPKhRgnevldZAr7SY'

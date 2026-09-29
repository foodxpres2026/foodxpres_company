import { getApp, getApps, initializeApp } from 'firebase/app'

export const firebaseConfig = {
  apiKey: 'AIzaSyCDoKTAyCJ_J1d-7DGFyNMca7-hdlUncoA',
  authDomain: 'foodxpres2026-c3168.firebaseapp.com',
  projectId: 'foodxpres2026-c3168',
  storageBucket: 'foodxpres2026-c3168.firebasestorage.app',
  messagingSenderId: '117612694174',
  appId: '1:117612694174:web:ed90e8acb962a92a31498f',
  measurementId: 'G-L4MDQR1CB1',
}

export const app = getApps().some((item) => item.name === 'foodxpres-driver')
  ? getApp('foodxpres-driver')
  : initializeApp(firebaseConfig, 'foodxpres-driver')

export const vapidKey = 'BCnpWPWPfMaNf0XuWVDQ-BQz-JfNkCOWAJp_Nlmt5zXGzzSHXgtrUUNNBsmV3kf7BBk6GaWPKhRgnevldZAr7SY'

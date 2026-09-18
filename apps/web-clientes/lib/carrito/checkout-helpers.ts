'use client'

import {
  leerDireccionTemporal,
  limpiarDireccionTemporal,
  type DireccionLocal,
} from '@/hooks/use-direccion-actual'

// ============================================
// Si el cliente se logueó después de agregar dirección
// temporal → guardar esa dirección en la BD
// ============================================
export async function transferirDireccionTemporalSiAplica() {
  const temporal = leerDireccionTemporal()
  if (!temporal) return null

  try {
    const res = await fetch('/api/direcciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etiqueta: temporal.etiqueta,
        direccion: temporal.direccion,
        referencia: temporal.referencia,
        lat: temporal.lat,
        lng: temporal.lng,
      }),
    })

    const data = await res.json()
    if (res.ok && data.ok) {
      limpiarDireccionTemporal()
      return data.data as { id: string }
    }
  } catch (err) {
    console.error('Error transfiriendo dirección temporal:', err)
  }

  return null
}
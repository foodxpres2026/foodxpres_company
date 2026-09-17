'use client'

import { useEffect, useState } from 'react'

export interface EnvioInfo {
  restaurante_id: string
  costo: number | null
  distancia_km: number | null
  duracion_min: number | null
}

// ============================================================
// Hook para calcular envíos de varios restaurantes
// ============================================================
export function useEnviosMultiples(
  restauranteIds: string[],
  lat: number | null,
  lng: number | null
) {
  const [envios, setEnvios] = useState<Record<string, EnvioInfo>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lat || !lng || restauranteIds.length === 0) {
      setEnvios({})
      return
    }

    const controller = new AbortController()
    setLoading(true)

    fetch('/api/envio/calcular-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurante_ids: restauranteIds,
        lat,
        lng,
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          const map: Record<string, EnvioInfo> = {}
          for (const item of data.data) {
            map[item.restaurante_id] = item
          }
          setEnvios(map)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [lat, lng, restauranteIds.join(',')])

  return { envios, loading }
}

// ============================================================
// Hook para un solo restaurante
// ============================================================
export function useEnvio(
  restauranteId: string,
  lat: number | null,
  lng: number | null
) {
  const { envios, loading } = useEnviosMultiples(
    restauranteId ? [restauranteId] : [],
    lat,
    lng
  )
  return {
    envio: envios[restauranteId] || null,
    loading,
  }
}
// ============================================================
// FÓRMULA DE HAVERSINE
// Distancia en línea recta entre 2 puntos de la Tierra (km)
// Se usa como FALLBACK si OpenRouteService falla
// ============================================================

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanciaRecta = R * c

  // Multiplicamos × 1.4 porque las calles no son líneas rectas
  // (factor empírico probado en ciudades latinoamericanas)
  return Math.round(distanciaRecta * 1.4 * 100) / 100
}
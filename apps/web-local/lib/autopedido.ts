import { getSql } from './db'
import { deliveryPriceForDistance, MAX_DELIVERY_DISTANCE_KM, type DeliveryPriceTable } from '../../../packages/utils/src/delivery'

export async function calculateLocalShipping(restaurantId: string, clientLat: number, clientLng: number) {
  const sql = getSql()
  const rows = await sql`
    SELECT c.tarifa_delivery_metodo, r.lat, r.lng
    FROM configuracion_sistema c CROSS JOIN restaurantes r
    WHERE c.id = 1 AND r.id = ${restaurantId} LIMIT 1
  ` as any[]
  const config = rows[0]
  if (!config || config.lat == null || config.lng == null) throw new Error('Guarda primero la ubicación del local.')
  const rLat = Number(config.lat), rLng = Number(config.lng)
  const roundCoord = (n: number) => Math.round(n * 10000) / 10000
  const oLat = roundCoord(clientLat), oLng = roundCoord(clientLng), dLat = roundCoord(rLat), dLng = roundCoord(rLng)
  const rad = (n: number) => n * Math.PI / 180
  const deltaLat = rad(clientLat - rLat), deltaLng = rad(clientLng - rLng)
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(rLat)) * Math.cos(rad(clientLat)) * Math.sin(deltaLng / 2) ** 2
  let km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.4
  km = Math.round(km * 100) / 100
  let duration = Math.round(km * 3)
  let source = 'haversine'
  try {
    const cached = await sql`SELECT distancia_km, duracion_min FROM rutas_cache WHERE restaurante_lat = ${dLat} AND restaurante_lng = ${dLng} AND cliente_lat = ${oLat} AND cliente_lng = ${oLng} AND creado_en > NOW() - INTERVAL '30 days' LIMIT 1` as any[]
    if (cached[0]) { km = Number(cached[0].distancia_km); duration = Number(cached[0].duracion_min); source = 'cache' }
  } catch { /* Route cache is optional; distance fallback still works. */ }
  const apiKey = process.env.ORS_API_KEY
  if (apiKey && source !== 'cache') {
    try {
      const res = await fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car', {
        method: 'POST', headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: [[clientLng, clientLat], [rLng, rLat]], units: 'km' }),
        signal: AbortSignal.timeout(5000),
      })
      const summary = (await res.json()).routes?.[0]?.summary
      if (res.ok && summary) {
        km = Math.round(summary.distance * 100) / 100; duration = Math.round(summary.duration / 60); source = 'openroute'
        try { await sql`INSERT INTO rutas_cache (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng, distancia_km, duracion_min) VALUES (${dLat}, ${dLng}, ${oLat}, ${oLng}, ${km}, ${duration}) ON CONFLICT (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng) DO NOTHING` } catch { /* Cache is best effort. */ }
      }
    } catch { /* Use the same Haversine fallback as web-clientes. */ }
  }
  const tabla = config.tarifa_delivery_metodo as DeliveryPriceTable
  const routeAvailable = source === 'cache' || source === 'openroute'
  const withinLimit = km <= MAX_DELIVERY_DISTANCE_KM
  const permitido = routeAvailable && withinLimit
  const razon = !routeAvailable ? 'RUTA_NO_DISPONIBLE' : !withinLimit ? 'SUPERA_DISTANCIA_MAXIMA' : null
  return {
    costo: permitido ? deliveryPriceForDistance(km, tabla) : null,
    distancia_km: km,
    duracion_min: duration,
    fuente: source,
    permitido,
    razon,
  }
}

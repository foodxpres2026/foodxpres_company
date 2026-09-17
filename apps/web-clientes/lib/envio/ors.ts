import { sql } from '../db'
import { haversineKm } from './haversine'

// ============================================================
// OBTENER DISTANCIA REAL POR CALLES
// 1. Busca en caché (BD)
// 2. Si no está, llama a OpenRouteService
// 3. Si ORS falla, usa Haversine × 1.4 como fallback
// ============================================================

const ORS_URL =
  'https://api.heigit.org/openrouteservice/v2/directions/driving-car'

// Redondeamos coordenadas a 4 decimales (~11m de precisión)
// para que direcciones cercanas compartan caché
function redondear(coord: number): number {
  return Math.round(coord * 10000) / 10000
}

export interface RutaResultado {
  distancia_km: number
  duracion_min: number | null
  fuente: 'cache' | 'openroute' | 'haversine'
}

export async function calcularRuta(
  origenLat: number,
  origenLng: number,
  destinoLat: number,
  destinoLng: number
): Promise<RutaResultado> {
  // Redondear
  const oLat = redondear(origenLat)
  const oLng = redondear(origenLng)
  const dLat = redondear(destinoLat)
  const dLng = redondear(destinoLng)

  // ==========================================
  // 1. BUSCAR EN CACHÉ
  // ==========================================
  try {
    const cache = (await sql`
      SELECT distancia_km, duracion_min
      FROM rutas_cache
      WHERE restaurante_lat = ${dLat}
        AND restaurante_lng = ${dLng}
        AND cliente_lat = ${oLat}
        AND cliente_lng = ${oLng}
        AND creado_en > NOW() - INTERVAL '30 days'
      LIMIT 1
    `) as any[]

    if (cache.length > 0) {
      return {
        distancia_km: Number(cache[0].distancia_km),
        duracion_min: cache[0].duracion_min,
        fuente: 'cache',
      }
    }
  } catch (err) {
    console.error('Error leyendo caché de rutas:', err)
  }

  // ==========================================
  // 2. LLAMAR A OPENROUTESERVICE
  // ==========================================
  const apiKey = process.env.ORS_API_KEY

  if (apiKey) {
    try {
      const res = await fetch(ORS_URL, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [oLng, oLat], // ORS usa [lng, lat]
            [dLng, dLat],
          ],
          units: 'km',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const summary = data.routes?.[0]?.summary

        if (summary) {
          const distancia = Math.round(summary.distance * 100) / 100
          const duracion = Math.round(summary.duration / 60) // a minutos

          // Guardar en caché
          try {
            await sql`
              INSERT INTO rutas_cache (
                restaurante_lat, restaurante_lng,
                cliente_lat, cliente_lng,
                distancia_km, duracion_min
              ) VALUES (
                ${dLat}, ${dLng}, ${oLat}, ${oLng},
                ${distancia}, ${duracion}
              )
              ON CONFLICT (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng)
              DO NOTHING
            `
          } catch (err) {
            console.error('Error guardando en caché:', err)
          }

          return {
            distancia_km: distancia,
            duracion_min: duracion,
            fuente: 'openroute',
          }
        }
      }
    } catch (err) {
      console.error('Error llamando a OpenRouteService:', err)
    }
  }

  // ==========================================
  // 3. FALLBACK: HAVERSINE × 1.4
  // ==========================================
  const distancia = haversineKm(oLat, oLng, dLat, dLng)
  const duracion = Math.round(distancia * 3) // aprox 20 km/h

  return {
    distancia_km: distancia,
    duracion_min: duracion,
    fuente: 'haversine',
  }
}
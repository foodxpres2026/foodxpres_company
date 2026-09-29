import { sql } from '../db'
import { calcularRuta } from './ors'
import { deliveryPriceForDistance, MAX_DELIVERY_DISTANCE_KM, type DeliveryPriceTable } from '../../../../packages/utils/src/delivery'

export interface CostoEnvioResultado {
  costo: number | null
  distancia_km: number
  duracion_min: number | null
  fuente: 'cache' | 'openroute' | 'haversine'
  permitido: boolean
  razon?: 'RUTA_NO_DISPONIBLE' | 'SUPERA_DISTANCIA_MAXIMA'
}

export async function calcularEnvio(
  restauranteId: string,
  clienteLat: number,
  clienteLng: number
): Promise<CostoEnvioResultado | null> {
  // 1. Config global
  const config = (await sql`
    SELECT tarifa_delivery_metodo
    FROM configuracion_sistema
    WHERE id = 1
    LIMIT 1
  `) as any[]

  // 2. Restaurante
  const restaurante = (await sql`
    SELECT id, lat, lng, costo_envio_minimo
    FROM restaurantes
    WHERE id = ${restauranteId}
    LIMIT 1
  `) as any[]

  if (config.length === 0 || restaurante.length === 0) return null

  const r = restaurante[0]
  if (!r.lat || !r.lng) return null

  const tabla = config[0].tarifa_delivery_metodo as DeliveryPriceTable

  // 3. Distancia real
  const ruta = await calcularRuta(
    clienteLat,
    clienteLng,
    Number(r.lat),
    Number(r.lng)
  )

  const costo = deliveryPriceForDistance(ruta.distancia_km, tabla)
  const razon = ruta.fuente === 'haversine'
    ? 'RUTA_NO_DISPONIBLE'
    : ruta.distancia_km > MAX_DELIVERY_DISTANCE_KM
      ? 'SUPERA_DISTANCIA_MAXIMA'
      : undefined

  return {
    costo: razon ? null : costo,
    distancia_km: ruta.distancia_km,
    duracion_min: ruta.duracion_min,
    fuente: ruta.fuente,
    permitido: !razon && costo !== null,
    ...(razon ? { razon } : {}),
  }
}

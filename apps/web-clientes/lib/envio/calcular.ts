import { sql } from '../db'
import { calcularRuta } from './ors'

// ============================================================
// REDONDEAR A MÚLTIPLOS DE 0.5
// Ej: 4.12 → 4.00, 4.30 → 4.50, 4.80 → 5.00
// ============================================================
function redondearMedioSoles(valor: number): number {
  return Math.ceil(valor * 2) / 2
}

export interface CostoEnvioResultado {
  costo: number
  distancia_km: number
  duracion_min: number | null
  fuente: 'cache' | 'openroute' | 'haversine'
  aplico_minimo: boolean
}

export async function calcularEnvio(
  restauranteId: string,
  clienteLat: number,
  clienteLng: number
): Promise<CostoEnvioResultado | null> {
  // 1. Config global
  const config = (await sql`
    SELECT tarifa_base, precio_por_km
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

  const tarifaBase = Number(config[0].tarifa_base)
  const precioPorKm = Number(config[0].precio_por_km)

  // 3. Distancia real
  const ruta = await calcularRuta(
    clienteLat,
    clienteLng,
    Number(r.lat),
    Number(r.lng)
  )

  // 4. Fórmula: base + (precio × km)
  const costoBruto = tarifaBase + precioPorKm * ruta.distancia_km

  // 5. Mínimo aplicable (local o global)
  let minimoAplicable: number
  if (r.costo_envio_minimo !== null) {
    minimoAplicable = Number(r.costo_envio_minimo)
  } else {
    const minGlobal = (await sql`
      SELECT monto_minimo_global FROM configuracion_sistema WHERE id = 1
    `) as any[]
    minimoAplicable = Number(minGlobal[0]?.monto_minimo_global || 0)
  }

  // 6. Aplicar el mayor (bruto vs mínimo)
  const costoAntesRedondeo = Math.max(costoBruto, minimoAplicable)

  // 7. Redondear a múltiplos de 0.5
  const costoFinal = redondearMedioSoles(costoAntesRedondeo)

  const aplicoMinimo = costoFinal === minimoAplicable && minimoAplicable > costoBruto

  return {
    costo: costoFinal,
    distancia_km: ruta.distancia_km,
    duracion_min: ruta.duracion_min,
    fuente: ruta.fuente,
    aplico_minimo: aplicoMinimo,
  }
}
export type DeliveryPriceTable = 'DETALLADA' | 'GENERAL'

const detailedBands: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 5], [1.1, 1.5, 5], [1.6, 2, 5.5], [2.1, 2.5, 6],
  [2.6, 3, 6.5], [3.1, 3.5, 7], [3.6, 4, 7.5], [4.1, 4.5, 8],
  [4.6, 5, 8.5], [5.1, 5.5, 9], [5.6, 6, 9.5], [6.1, 6.5, 9.5],
  [6.6, 7, 10], [7.1, 7.5, 10.5], [7.6, 7.6, 10.5], [7.7, 8, 11],
  [8.1, 8.5, 11.5], [8.6, 8.9, 11.5], [9, 9, 12], [9.1, 9.5, 12.5],
  [9.6, 10, 12.5], [10.1, 10.5, 13], [10.6, 11, 13],
]

const generalBands: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 5], [1.1, 2, 5.5], [2.1, 2.5, 6], [2.6, 3, 6.5],
  [3.1, 3.5, 7], [3.6, 4, 7.5], [4.1, 4.5, 8], [4.6, 5, 8.5],
  [5.1, 5.5, 9], [5.6, 6, 9.5], [6.1, 6.5, 10], [6.6, 7, 10.5],
  [7.1, 7.5, 11], [7.6, 8, 11.5], [8.1, 8.5, 12], [8.6, 9, 12.5],
  [9.1, 9.5, 13], [9.6, 10, 13.5], [10.1, 10.5, 14],
  [10.6, 11, 14.5], [11.1, 11.5, 15], [11.6, 12, 15.5],
]

/** Tarifas FoodXpres del documento. Tramos posteriores al último publicado
 * prolongan el patrón visible de S/ 0.50 por cada 0.5 km hasta el límite de 15 km. */
export function deliveryPriceForDistance(km: number, table: DeliveryPriceTable): number | null {
  if (!Number.isFinite(km) || km < 0 || km > 15) return null
  const distance = Math.round(km * 10) / 10
  const bands = table === 'DETALLADA' ? detailedBands : generalBands
  const match = bands.find(([min, max]) => distance >= min && distance <= max)
  if (match) return match[2]

  const last = bands[bands.length - 1]
  if (distance > last[1] && distance <= 15) {
    const halfKmSteps = Math.ceil((distance - last[1]) / 0.5)
    return Math.round((last[2] + halfKmSteps * 0.5) * 100) / 100
  }
  return null
}

export const MAX_DELIVERY_DISTANCE_KM = 15

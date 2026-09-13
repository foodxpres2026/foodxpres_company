// Tipos comunes del proyecto FoodXpres
// Se irán agregando conforme avancemos

export type OrderStatus =
  | 'PENDIENTE'
  | 'ACEPTADO'
  | 'PREPARANDO'
  | 'LISTO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'RECHAZADO'
  | 'CANCELADO'

export type UserRole = 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER'

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
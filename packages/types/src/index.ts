// ============================================
// ESTADOS DEL PEDIDO
// ============================================
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'

// ============================================
// ENTIDADES BASE
// ============================================
export interface Restaurant {
  id: string
  name: string
  address: string
  phone: string
  logoUrl: string | null
  bannerUrl: string | null
  isActive: boolean
  createdAt: string
}

export interface Category {
  id: string
  restaurantId: string
  name: string
  order: number
}

export interface Product {
  id: string
  restaurantId: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
}

export interface Customer {
  id: string
  phone: string
  name: string | null
  createdAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Order {
  id: string
  customerId: string
  restaurantId: string
  driverId: string | null
  status: OrderStatus
  total: number
  deliveryAddress: string
  deliveryReference: string | null
  estimatedTime: number | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  vehicle: string
  isActive: boolean
}
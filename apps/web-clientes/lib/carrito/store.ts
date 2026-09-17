'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OpcionElegida {
  grupo_titulo: string
  choice_nombre: string
  precio_extra: number
}

export interface CarritoItem {
  // ID único por combinación (plato + opciones + notas)
  id: string
  plato_id: string
  plato_nombre: string
  plato_imagen: string | null
  restaurante_id: string
  restaurante_slug: string
  restaurante_nombre: string
  precio_unitario: number
  cantidad: number
  notas: string | null
  opciones: OpcionElegida[]
}

interface CarritoState {
  items: CarritoItem[]
  agregar: (item: Omit<CarritoItem, 'id'>) => void
  eliminar: (id: string) => void
  cambiarCantidad: (id: string, cantidad: number) => void
  vaciar: () => void
  // Selectores
  totalItems: () => number
  subtotal: () => number
  restaurantesUnicos: () => number
}

// Genera ID único basado en plato + opciones + notas
function generarId(item: Omit<CarritoItem, 'id'>): string {
  const opcionesKey = item.opciones
    .map((o) => `${o.grupo_titulo}:${o.choice_nombre}`)
    .sort()
    .join('|')
  return `${item.plato_id}__${opcionesKey}__${item.notas || ''}`
}

export const useCarrito = create<CarritoState>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (nuevoItem) => {
        const id = generarId(nuevoItem)
        const existente = get().items.find((i) => i.id === id)

        if (existente) {
          set({
            items: get().items.map((i) =>
              i.id === id
                ? { ...i, cantidad: i.cantidad + nuevoItem.cantidad }
                : i
            ),
          })
        } else {
          set({ items: [...get().items, { ...nuevoItem, id }] })
        }
      },

      eliminar: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      cambiarCantidad: (id, cantidad) => {
        if (cantidad <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) })
          return
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, cantidad } : i
          ),
        })
      },

      vaciar: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.cantidad, 0),

      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + i.precio_unitario * i.cantidad,
          0
        ),

      restaurantesUnicos: () =>
        new Set(get().items.map((i) => i.restaurante_id)).size,
    }),
    {
      name: 'foodxpres-carrito',
    }
  )
)
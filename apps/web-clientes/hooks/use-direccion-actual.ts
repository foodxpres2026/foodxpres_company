'use client'

import { useEffect, useState } from 'react'

export interface DireccionLocal {
  id?: string
  etiqueta: string
  direccion: string
  referencia: string
  lat: number
  lng: number
  es_predeterminada?: boolean
}

const STORAGE_KEY = 'foodxpres-direccion-temporal'

// ============================================
// Leer dirección temporal (sin login)
// ============================================
export function leerDireccionTemporal(): DireccionLocal | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DireccionLocal
  } catch {
    return null
  }
}

// ============================================
// Guardar dirección temporal
// ============================================
export function guardarDireccionTemporal(direccion: DireccionLocal) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(direccion))
    // Avisar a otros componentes
    window.dispatchEvent(new Event('direccion-temporal-cambiada'))
  } catch {}
}

// ============================================
// Limpiar (después de transferir a la BD)
// ============================================
export function limpiarDireccionTemporal() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('direccion-temporal-cambiada'))
  } catch {}
}

// ============================================
// Hook que devuelve la dirección según el caso
// ============================================
export function useDireccionActual(
  direccionDeBD: DireccionLocal | null | undefined
) {
  const [direccionTemporal, setDireccionTemporal] =
    useState<DireccionLocal | null>(null)

  useEffect(() => {
    // Leer inicial
    setDireccionTemporal(leerDireccionTemporal())

    // Escuchar cambios
    function onChange() {
      setDireccionTemporal(leerDireccionTemporal())
    }
    window.addEventListener('direccion-temporal-cambiada', onChange)

    return () => {
      window.removeEventListener('direccion-temporal-cambiada', onChange)
    }
  }, [])

  // Si tiene dirección de BD (logueado con dirección) → esa manda
  if (direccionDeBD) return direccionDeBD
  // Si no → la temporal del localStorage
  return direccionTemporal
}
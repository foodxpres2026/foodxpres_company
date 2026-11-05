'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OrdenRestaurante({
  id,
  nombre,
  index,
  total,
  ids,
}: {
  id: string
  nombre: string
  index: number
  total: number
  ids: string[]
}) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)

  async function mover(direccion: -1 | 1) {
    const destino = index + direccion
    if (guardando || destino < 0 || destino >= total) return

    const nuevoOrden = [...ids]
    ;[nuevoOrden[index], nuevoOrden[destino]] = [nuevoOrden[destino], nuevoOrden[index]]
    setGuardando(true)

    try {
      const response = await fetch('/api/restaurantes/orden', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: nuevoOrden }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el orden')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el orden')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-1" aria-label={`Orden de ${nombre}`}>
      <button
        type="button"
        aria-label={`Subir ${nombre}`}
        title="Subir"
        disabled={guardando || index === 0}
        onClick={() => void mover(-1)}
        className="h-7 w-8 rounded-md border border-line text-gray-300 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`Bajar ${nombre}`}
        title="Bajar"
        disabled={guardando || index === total - 1}
        onClick={() => void mover(1)}
        className="h-7 w-8 rounded-md border border-line text-gray-300 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  )
}

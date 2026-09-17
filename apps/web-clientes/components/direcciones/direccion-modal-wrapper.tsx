'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DireccionModal, { type Direccion } from './direccion-modal'
import {
  guardarDireccionTemporal,
  limpiarDireccionTemporal,
} from '@/hooks/use-direccion-actual'

interface Props {
  open: boolean
  onClose: () => void
  estaLogueado: boolean
  initialData?: Partial<Direccion>
  onGuardada?: () => void
}

export default function DireccionModalWrapper({
  open,
  onClose,
  estaLogueado,
  initialData,
  onGuardada,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function guardar(data: Direccion) {
    setLoading(true)
    try {
      if (estaLogueado) {
        // Guardar en BD
        const isEdit = !!data.id
        const url = isEdit ? `/api/direcciones/${data.id}` : '/api/direcciones'

        const res = await fetch(url, {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            etiqueta: data.etiqueta,
            direccion: data.direccion,
            referencia: data.referencia,
            lat: data.lat,
            lng: data.lng,
          }),
        })

        const resData = await res.json()
        if (!res.ok || !resData.ok) {
          throw new Error(resData.error || 'Error')
        }
        limpiarDireccionTemporal()
      } else {
        // Guardar en localStorage
        guardarDireccionTemporal({
          etiqueta: data.etiqueta,
          direccion: data.direccion,
          referencia: data.referencia,
          lat: data.lat,
          lng: data.lng,
        })
      }

      onClose()
      onGuardada?.()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <DireccionModal
      open={open}
      onClose={onClose}
      onGuardar={guardar}
      initialData={initialData}
    />
  )
}
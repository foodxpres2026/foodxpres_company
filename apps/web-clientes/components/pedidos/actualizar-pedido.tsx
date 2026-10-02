'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ActualizarPedido() {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [router])

  return null
}

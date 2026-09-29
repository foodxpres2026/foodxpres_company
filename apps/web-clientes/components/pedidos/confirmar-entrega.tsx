'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfirmarEntrega({ subPedidoId }: { subPedidoId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/pedidos/entrega/${subPedidoId}/confirmar`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo confirmar la entrega')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(false) }
  }
  return <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
    <p className="text-sm font-bold text-white">¿Ya recibiste este pedido?</p>
    <p className="mt-1 text-xs text-gray-400">Confirma solo cuando tengas el pedido. El driver no puede cerrar la entrega antes de tu confirmación.</p>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    <button type="button" onClick={() => void confirm()} disabled={busy} className="mt-3 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">{busy ? 'Confirmando…' : 'Sí, recibí mi pedido'}</button>
  </div>
}

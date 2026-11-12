'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfirmarEntrega({ subPedidoId, yaFinalizado = false }: { subPedidoId: string; yaFinalizado?: boolean }) {
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
    <p className="text-sm font-bold text-white">{yaFinalizado ? '¿Recibiste correctamente este pedido?' : '¿Ya recibiste este pedido?'}</p>
    <p className="mt-1 text-xs text-gray-400">{yaFinalizado ? 'Este pedido ya fue cerrado. Si lo recibiste, confirma para dejar constancia de la recepción.' : 'Confirma cuando tengas el pedido. Tu confirmación cerrará la entrega y permitirá que el driver continúe con otros pedidos.'}</p>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    <button type="button" onClick={() => void confirm()} disabled={busy} className="mt-3 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">{busy ? 'Guardando…' : yaFinalizado ? 'Sí, recibí el pedido' : 'Sí, recibí mi pedido'}</button>
  </div>
}

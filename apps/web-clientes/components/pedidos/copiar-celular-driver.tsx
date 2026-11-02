'use client'

import { useState } from 'react'

export default function CopiarCelularDriver({ celular }: { celular: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(celular)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1800)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <button type="button" onClick={copiar} className="mt-2 rounded-lg border border-brand/40 px-3 py-2 text-xs font-bold text-brand hover:bg-brand/10">
      {copiado ? '✓ Número copiado' : 'Copiar número para pagar'}
    </button>
  )
}

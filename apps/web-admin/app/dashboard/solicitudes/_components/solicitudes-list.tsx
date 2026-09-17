'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Solicitud {
  id: string
  celular: string
  usuario_id: string | null
  estado: string
  creado_en: string
  cliente_nombre: string | null
}

export default function SolicitudesList({
  initialData,
}: {
  initialData: Solicitud[]
}) {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState(initialData)
  const [loading, setLoading] = useState<string | null>(null)
  const [resetInfo, setResetInfo] = useState<{
    password: string
    whatsapp_url: string
    celular: string
  } | null>(null)

  async function resetear(s: Solicitud) {
    if (
      !confirm(
        `¿Resetear la contraseña de ${s.cliente_nombre || s.celular}? Se generará una nueva.`
      )
    )
      return

    setLoading(s.id)
    try {
      const res = await fetch(`/api/solicitudes/${s.id}/resetear`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert(data.error || 'Error al resetear')
        return
      }

      setResetInfo({
        password: data.password_temporal,
        whatsapp_url: data.whatsapp_url,
        celular: data.celular,
      })
      setSolicitudes(solicitudes.filter((x) => x.id !== s.id))
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  function tiempoTranscurrido(fecha: string) {
    const min = Math.floor(
      (Date.now() - new Date(fecha).getTime()) / 60000
    )
    if (min < 1) return 'hace unos segundos'
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    return `hace ${hrs}h`
  }

  return (
    <div className="space-y-4">
      {/* MODAL DE ÉXITO */}
      {resetInfo && (
        <div className="bg-brand/10 border border-brand/30 rounded-2xl p-5">
          <p className="text-brand font-bold mb-3">
            ✅ Contraseña reseteada correctamente
          </p>
          <div className="bg-surface-dark rounded-xl p-4 mb-3">
            <p className="text-xs text-gray-500 uppercase mb-1">
              Nueva contraseña temporal
            </p>
            <p className="text-2xl font-mono font-bold text-white">
              {resetInfo.password}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Celular: <strong className="text-white">+51 {resetInfo.celular}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={resetInfo.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand hover:bg-brand-dark text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2"
            >
              📱 Abrir WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setResetInfo(null)}
              className="bg-surface-light hover:bg-[#222] text-gray-300 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {solicitudes.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-gray-400">
            No hay solicitudes pendientes
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Todo en orden 👌
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <ul className="divide-y divide-line">
            {solicitudes.map((s) => (
              <li
                key={s.id}
                className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-lg flex-shrink-0">
                    🔑
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {s.cliente_nombre || 'Sin registro'}
                    </p>
                    <p className="text-xs text-gray-500">
                      📱 +51 {s.celular} · {tiempoTranscurrido(s.creado_en)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/51${s.celular}?text=${encodeURIComponent(
                      'Hola! Vi tu solicitud de FoodXpres. ¿Te ayudo con tu contraseña?'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-surface-light hover:bg-[#222] text-gray-300 px-3 py-2 rounded-lg transition-colors"
                  >
                    💬 WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => resetear(s)}
                    disabled={loading === s.id}
                    className="text-xs bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold px-3 py-2 rounded-lg transition-colors"
                  >
                    {loading === s.id ? '...' : '🔑 Resetear'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
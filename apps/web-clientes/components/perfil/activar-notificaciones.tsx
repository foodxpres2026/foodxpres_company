'use client'

import { useFCM } from '@/lib/firebase/use-fcm'

export default function ActivarNotificaciones() {
  const { estado, activar } = useFCM(true)

  // Si no hay soporte, no mostrar nada
  if (estado === 'sin-soporte') return null

  // Ya está activado
  if (estado === 'concedido') {
    return (
      <div className="bg-brand/5 border border-brand/30 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-brand">Notificaciones activadas</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Te avisaremos cuando tu pedido cambie de estado
          </p>
        </div>
      </div>
    )
  }

  // Denegado
  if (estado === 'denegado') {
    return (
      <div className="bg-surface border border-line rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">🔕</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Notificaciones bloqueadas</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Actívalas desde la configuración de tu navegador
          </p>
        </div>
      </div>
    )
  }

  // Inicial / solicitando / error
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            Activa las notificaciones
          </p>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            Entérate al instante cuando tu pedido sea aceptado o esté en camino
          </p>
          <button
            type="button"
            onClick={activar}
            disabled={estado === 'solicitando'}
            className="bg-brand hover:bg-brand-dark disabled:bg-brand/40 text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {estado === 'solicitando'
              ? 'Activando...'
              : estado === 'error'
              ? 'Reintentar'
              : 'Activar notificaciones'}
          </button>
        </div>
      </div>
    </div>
  )
}
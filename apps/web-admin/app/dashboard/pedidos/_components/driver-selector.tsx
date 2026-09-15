'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Driver {
  id: string
  nombre: string
  celular: string
  disponible: boolean
  pedidos_activos: number
}

export default function DriverSelector({
  pedidoId,
  driverActual,
}: {
  pedidoId: string
  driverActual: { id: string; nombre: string } | null
}) {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    fetch('/api/drivers')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          // Solo drivers activos
          setDrivers(data.data.filter((d: any) => d.activo))
        }
      })
  }, [])

  async function asignar(driverId: string | null) {
    if (
      driverId === driverActual?.id ||
      (driverId === null && driverActual === null)
    ) {
      setAbierto(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/driver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId }),
      })
      if (res.ok) {
        setAbierto(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          🏍️ Driver
        </h3>
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          className="text-xs bg-brand/10 hover:bg-brand/20 text-brand font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {abierto ? 'Cancelar' : driverActual ? 'Cambiar' : 'Asignar'}
        </button>
      </div>

      {driverActual ? (
        <div className="flex items-center gap-3 p-3 bg-surface-dark rounded-xl">
          <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold">
            {driverActual.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {driverActual.nombre}
            </p>
            <p className="text-xs text-gray-500">Repartidor asignado</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic p-3 bg-surface-dark rounded-xl">
          Sin driver asignado
        </p>
      )}

      {/* DROPDOWN */}
      {abierto && (
        <div className="mt-3 bg-surface-dark border border-line rounded-xl max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => asignar(null)}
            disabled={loading}
            className="w-full text-left px-3 py-2.5 text-sm text-gray-500 hover:bg-surface-light transition-colors border-b border-line italic disabled:opacity-50"
          >
            Sin driver
          </button>
          {drivers.length === 0 ? (
            <p className="p-3 text-xs text-gray-500 text-center">
              No hay drivers activos
            </p>
          ) : (
            drivers.map((d) => {
              const activo = d.id === driverActual?.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => asignar(d.id)}
                  disabled={loading || activo}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                    activo
                      ? 'bg-brand/10 text-brand cursor-default'
                      : 'text-white hover:bg-surface-light'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xs flex-shrink-0">
                    {d.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{d.nombre}</p>
                    <p className="text-[10px] text-gray-500">
                      {d.celular}
                      {d.pedidos_activos > 0 && (
                        <span className="ml-1 text-yellow-500">
                          · {d.pedidos_activos} activo
                          {d.pedidos_activos === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                  </div>
                  {activo && (
                    <span className="text-[10px] font-bold">ACTUAL</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
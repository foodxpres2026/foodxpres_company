'use client'

import { useEffect, useState } from 'react'
import MapaSelector from './mapa-selector'

export interface Direccion {
  id?: string
  etiqueta: string
  direccion: string
  referencia: string
  lat: number
  lng: number
  es_predeterminada?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onGuardar: (direccion: Direccion) => Promise<void>
  initialData?: Partial<Direccion>
}

const PUCALLPA_CENTRO = { lat: -8.3791, lng: -74.5539 }

export default function DireccionModal({
  open,
  onClose,
  onGuardar,
  initialData,
}: Props) {
  const [paso, setPaso] = useState<'elegir' | 'mapa'>('elegir')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lat, setLat] = useState(initialData?.lat ?? PUCALLPA_CENTRO.lat)
  const [lng, setLng] = useState(initialData?.lng ?? PUCALLPA_CENTRO.lng)
  const [etiqueta, setEtiqueta] = useState(initialData?.etiqueta ?? 'Casa')
  const [referencia, setReferencia] = useState(initialData?.referencia ?? '')
  const [direccionTexto, setDireccionTexto] = useState(
    initialData?.direccion ?? ''
  )

  useEffect(() => {
    if (open) {
      setPaso('elegir')
      setError(null)
      setLoading(false)
      setLat(initialData?.lat ?? PUCALLPA_CENTRO.lat)
      setLng(initialData?.lng ?? PUCALLPA_CENTRO.lng)
      setEtiqueta(initialData?.etiqueta ?? 'Casa')
      setReferencia(initialData?.referencia ?? '')
      setDireccionTexto(initialData?.direccion ?? '')
    }
  }, [open, initialData])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  async function usarGPS() {
    setError(null)
    setLoading(true)

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setLat(latitude)
        setLng(longitude)

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
          )
          const data = await res.json()
          const dir =
            data.display_name?.split(',').slice(0, 4).join(', ') ||
            'Ubicación actual'
          setDireccionTexto(dir)
          setPaso('mapa')
        } catch {
          setDireccionTexto('Ubicación actual')
          setPaso('mapa')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError(
          'No pudimos obtener tu ubicación. Verifica los permisos de tu navegador.'
        )
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function confirmar() {
    if (!direccionTexto.trim()) {
      setError('Escribe una dirección o usa el mapa')
      return
    }
    if (!etiqueta.trim()) {
      setError('Ponle un nombre (Casa, Trabajo...)')
      return
    }

    setError(null)
    setLoading(true)

    try {
      await onGuardar({
        etiqueta: etiqueta.trim(),
        direccion: direccionTexto.trim(),
        referencia: referencia.trim() || '',
        lat,
        lng,
      })
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER con botón Atrás */}
        <div className="flex items-center gap-3 p-4 md:p-5 border-b border-line">
          {paso !== 'elegir' && (
            <button
              type="button"
              onClick={() => setPaso('elegir')}
              className="w-9 h-9 rounded-full bg-surface-light hover:bg-line flex items-center justify-center text-gray-300 hover:text-white transition-colors flex-shrink-0 text-lg"
              aria-label="Atrás"
            >
              ←
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">
              📍 {paso === 'elegir' ? '¿A dónde te llevamos?' : 'Confirma tu dirección'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {paso === 'elegir'
                ? 'Elige cómo quieres ubicarte'
                : 'Ajusta el pin si es necesario'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-light hover:bg-line flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {/* PASO 1: ELEGIR */}
          {paso === 'elegir' && (
            <>
              <button
                type="button"
                onClick={usarGPS}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 bg-surface-dark border border-line rounded-2xl hover:border-brand transition-colors text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center text-2xl flex-shrink-0">
                  🛵
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">
                    Usar mi ubicación actual
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Rápido y preciso con GPS
                  </p>
                </div>
                <span className="text-gray-500 text-xl">›</span>
              </button>

              <button
                type="button"
                onClick={() => setPaso('mapa')}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 bg-surface-dark border border-line rounded-2xl hover:border-brand transition-colors text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-jaguar/15 flex items-center justify-center text-2xl flex-shrink-0">
                  🗺️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">
                    Buscar en el mapa
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Elige tu casa manualmente
                  </p>
                </div>
                <span className="text-gray-500 text-xl">›</span>
              </button>

              {loading && (
                <p className="text-center text-sm text-gray-400 py-4 animate-pulse">
                  Obteniendo tu ubicación...
                </p>
              )}

              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </>
          )}

          {/* PASO 2: MAPA / CONFIRMAR */}
          {paso === 'mapa' && (
            <>
              <MapaSelector
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setLat(newLat)
                  setLng(newLng)
                  fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&accept-language=es`
                  )
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.display_name) {
                        const dir = data.display_name
                          .split(',')
                          .slice(0, 4)
                          .join(', ')
                        setDireccionTexto(dir)
                      }
                    })
                    .catch(() => {})
                }}
              />

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccionTexto}
                  onChange={(e) => setDireccionTexto(e.target.value)}
                  placeholder="Jr. Raimondi 123, Pucallpa"
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Portón verde, 2do piso, frente a..."
                  className="w-full px-4 py-3 bg-surface-dark border border-line-light rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  Guardar como
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['Casa', 'Trabajo', 'Otro'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEtiqueta(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        etiqueta === tag
                          ? 'bg-brand text-black border-brand'
                          : 'bg-surface-dark text-gray-300 border-line-light hover:border-brand'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-line bg-surface flex items-center gap-3">
          {paso !== 'elegir' ? (
            <button
              type="button"
              onClick={confirmar}
              disabled={loading || !direccionTexto.trim()}
              className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-brand/30 disabled:text-black/50 text-black font-bold py-3 rounded-xl transition-colors active:scale-[0.98]"
            >
              {loading ? 'Guardando...' : '✓ Confirmar dirección'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-light hover:bg-[#222] text-gray-300 font-medium py-3 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
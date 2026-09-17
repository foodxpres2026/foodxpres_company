'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export default function MapaSelector({ lat, lng, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mapRef.current) return

    // 🛡️ Si ya existe un mapa asociado a este elemento, lo limpiamos
    // Leaflet guarda una referencia en el elemento DOM
    if ((mapRef.current as any)._leaflet_id) {
      delete (mapRef.current as any)._leaflet_id
    }

    // Destruir instancia previa si existe
    if (mapInstance.current) {
      try {
        mapInstance.current.remove()
      } catch (e) {
        // ignorar
      }
      mapInstance.current = null
      markerRef.current = null
    }

    let cancelado = false

    import('leaflet').then((L) => {
      if (cancelado || !mapRef.current) return

      // 🛡️ Segunda verificación después del import asíncrono
      if ((mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }

      // Fix iconos por defecto de Leaflet
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      try {
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([lat, lng], 16)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map)

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onChange(pos.lat, pos.lng)
        })

        map.on('click', (e: any) => {
          const { lat: newLat, lng: newLng } = e.latlng
          marker.setLatLng([newLat, newLng])
          onChange(newLat, newLng)
        })

        mapInstance.current = map
        markerRef.current = marker
        setReady(true)
      } catch (err) {
        console.error('Error creando mapa:', err)
      }
    })

    return () => {
      cancelado = true
      if (mapInstance.current) {
        try {
          mapInstance.current.remove()
        } catch (e) {
          // ignorar
        }
        mapInstance.current = null
        markerRef.current = null
      }
      if (mapRef.current && (mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar marcador cuando cambian lat/lng desde afuera
  useEffect(() => {
    if (!ready) return
    if (markerRef.current && mapInstance.current) {
      markerRef.current.setLatLng([lat, lng])
      mapInstance.current.setView([lat, lng], 16, { animate: true })
    }
  }, [lat, lng, ready])

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-64 rounded-xl border border-line overflow-hidden z-0"
        style={{ minHeight: '256px' }}
      />
      <p className="text-xs text-gray-500 mt-2 text-center">
        Toca el mapa o arrastra el pin para ajustar tu ubicación
      </p>
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { title: string; lat: number; lng: number; onClose: () => void; onSelect: (lat: number, lng: number) => void }

export default function MapPicker({ title, lat, lng, onClose, onSelect }: Props) {
  const mapNode = useRef<HTMLDivElement>(null), mapRef = useRef<any>(null), markerRef = useRef<any>(null), onSelectRef = useRef(onSelect)
  const initial = useRef({ lat, lng })
  const [error, setError] = useState(''), [coords, setCoords] = useState({ lat, lng })
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => {
    let cancelled = false
    import('leaflet').then(L => {
      if (cancelled || !mapNode.current) return
      // Keep Leaflet's marker assets independent from Next's image loader.
      // @ts-expect-error Leaflet's bundled defaults are assigned below.
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })
      const map = L.map(mapNode.current!, { zoomControl: true }).setView([initial.current.lat, initial.current.lng], 16)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(map)
      const marker = L.marker([initial.current.lat, initial.current.lng], { draggable: true }).addTo(map)
      const update = (point: { lat: number; lng: number }) => { marker.setLatLng([point.lat, point.lng]); setCoords({ lat: point.lat, lng: point.lng }); onSelectRef.current(point.lat, point.lng) }
      marker.on('dragend', () => update(marker.getLatLng()))
      map.on('click', (event: any) => update(event.latlng))
      mapRef.current = map; markerRef.current = marker
      // Igual que en Clientes: el modal puede terminar de medir/animar después
      // de que Leaflet cree el mapa. Recalcular en dos frames evita que quede
      // visible el contenedor sin las teselas.
      const invalidateSize = () => map.invalidateSize({ pan: false })
      requestAnimationFrame(() => requestAnimationFrame(invalidateSize))
      const observer = new ResizeObserver(invalidateSize)
      observer.observe(mapNode.current!)
      map.on('unload', () => observer.disconnect())
    }).catch(() => setError('No se pudo cargar el mapa. Revisa tu conexión.'))
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null } }
  }, [])
  function useGps() {
    setError('')
    if (!navigator.geolocation) { setError('Este navegador no permite obtener GPS.'); return }
    navigator.geolocation.getCurrentPosition(({ coords: point }) => {
      const next = { lat: point.latitude, lng: point.longitude }; setCoords(next); onSelectRef.current(next.lat, next.lng)
      markerRef.current?.setLatLng([next.lat, next.lng]); mapRef.current?.setView([next.lat, next.lng], 17)
    }, () => setError('No se pudo obtener la ubicación. Permite el acceso al GPS o mueve el pin en el mapa.'), { enableHighAccuracy: true, timeout: 12000 })
  }
  return <div className="map-picker-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="map-picker" role="dialog" aria-modal="true" aria-labelledby="map-picker-title"><header><div><h2 id="map-picker-title">📍 {title}</h2><p>Toca el mapa o arrastra el pin hasta el lugar correcto.</p></div><button onClick={onClose} aria-label="Cerrar mapa">×</button></header><div ref={mapNode} className="map-picker-canvas"/>{error&&<p className="map-picker-error">{error}</p>}<footer><span>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span><button className="local-refresh" onClick={useGps}>Usar GPS</button><button className="local-primary-button" onClick={onClose}>Confirmar ubicación</button></footer></section></div>
}

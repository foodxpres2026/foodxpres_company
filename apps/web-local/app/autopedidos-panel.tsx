'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import MapPicker from './map-picker'

type Restaurant = { nombre: string; celular: string | null; direccion_fisica: string | null; referencia: string | null; lat: number | null; lng: number | null }
type Shipping = { costo: number | null; distancia_km: number; duracion_min: number; fuente: string; permitido: boolean; razon?: string | null }
type Data = { restaurant: Restaurant }
const money = (n: number) => `S/ ${n.toFixed(2)}`
const inputStyle: CSSProperties = { width: '100%', minWidth: 0, padding: '11px 12px', color: '#edf2e9', background: '#0a0c0a', border: '1px solid #343a34', borderRadius: 9, outline: 'none' }
const labelStyle: CSSProperties = { display: 'grid', gap: 6, color: '#9aa69a', fontSize: 11 }

export default function AutopedidosPanel({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const [data, setData] = useState<Data | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [address, setAddress] = useState(''), [reference, setReference] = useState(''), [celular, setCelular] = useState(''), [lat, setLat] = useState(''), [lng, setLng] = useState(''), [shipping, setShipping] = useState<Shipping | null>(null), [shippingBusy, setShippingBusy] = useState(false)
  const [localLat, setLocalLat] = useState(''), [localLng, setLocalLng] = useState('')
  const [mapTarget, setMapTarget] = useState<'local' | 'client' | null>(null)
  const load = useCallback(async () => { setBusy(true); setError(''); try { const res = await fetch('/api/local/autopedidos', { cache: 'no-store' }); const body = await res.json(); if (!res.ok || !body.ok) throw new Error(body.error || 'No se pudo cargar el local'); setData(body.data); setMapTarget('client') } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión') } finally { setBusy(false) } }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    setShipping(null)
    const clientLat = Number(lat), clientLng = Number(lng)
    if (!Number.isFinite(clientLat) || !Number.isFinite(clientLng) || lat.trim() === '' || lng.trim() === '' || data?.restaurant.lat == null || data?.restaurant.lng == null) return
    let ignore = false; const timer = window.setTimeout(async () => { setShippingBusy(true); try { const res = await fetch('/api/local/autopedidos/shipping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: clientLat, lng: clientLng }) }); const body = await res.json(); if (!ignore && res.ok && body.ok) setShipping(body.data); else if (!ignore && body.error) setError(body.error) } catch { if (!ignore) setError('No se pudo calcular el envío.') } finally { if (!ignore) setShippingBusy(false) } }, 450)
    return () => { ignore = true; window.clearTimeout(timer) }
  }, [lat, lng, data?.restaurant.lat, data?.restaurant.lng])
  async function closeMap() {
    const chosenLat = Number(lat), chosenLng = Number(lng)
    setMapTarget(null)
    if (!Number.isFinite(chosenLat) || !Number.isFinite(chosenLng)) return
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${chosenLat}&lon=${chosenLng}&accept-language=es`)
      const result = await response.json(), suggested = result.display_name?.split(',').slice(0, 4).join(', ')
      if (suggested && !address.trim()) setAddress(suggested)
      else if (!address.trim()) setAddress('Ubicación marcada en el mapa')
    } catch { if (!address.trim()) setAddress('Ubicación marcada en el mapa') }
  }
  async function submit() { setBusy(true); setError(''); setNotice(''); try { const res = await fetch('/api/local/autopedidos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ celular, direccion:address, referencia:reference || null, lat:Number(lat), lng:Number(lng), items:[] }) }); const body = await res.json(); if (!res.ok || !body.ok) throw new Error(body.error || 'No se pudo crear el pedido'); setNotice(`Autopedido ${body.data.codigo} registrado · envío ${money(body.data.costo_envio)}`); setAddress(''); setReference(''); setCelular(''); setLat(''); setLng(''); setShipping(null); onCreated() } catch(e) { setError(e instanceof Error ? e.message : 'Error de conexión') } finally { setBusy(false) } }
  const localReady = Boolean(data?.restaurant.lat != null && data?.restaurant.lng != null)
  const clientReady = /^9\d{8}$/.test(celular) && address.trim().length>=3 && Number.isFinite(Number(lat)) && lat!=='' && Number.isFinite(Number(lng)) && lng!==''
  return <div>
    <div className="local-page-heading"><div><p className="local-eyebrow">PEDIDO PARA TU LOCAL</p><h1>Autopedido rápido</h1><p>El punto de recojo y el teléfono del local se toman de la ficha del restaurante.</p></div><button className="local-refresh" onClick={onBack}>← <span>Volver a pedidos</span></button></div>
    {notice && <div className="local-notice" role="status">✓ {notice}</div>}{error && <div className="local-error" role="alert"><span>{error}</span><button onClick={()=>setError('')}>Cerrar</button></div>}
    {busy && !data ? <div className="local-empty">Cargando menú…</div> : data && <div className="auto-layout">
      <div className="auto-main">
        <section className="auto-panel"><div className="auto-panel-heading"><div><h2>Entrega del cliente</h2><p>El recojo será en {data.restaurant.nombre}; no necesitas volver a indicar su ubicación.</p></div></div>
          <div className="auto-location-card"><h3>📍 Recojo en {data.restaurant.nombre}</h3><p>{localReady ? data.restaurant.direccion_fisica || 'Ubicación del local guardada' : 'El restaurante todavía no tiene ubicación guardada.'}</p><p>Teléfono del local: {data.restaurant.celular || 'Sin teléfono registrado'}</p></div>
          <div className="auto-location-card"><h3>🏠 Entrega al cliente</h3><p>Selecciona su ubicación en el mapa, ingresa su celular y agrega una referencia si hace falta.</p><div className="auto-fields"><label style={labelStyle}>Celular del cliente<input style={inputStyle} type="tel" inputMode="numeric" maxLength={9} value={celular} onChange={e=>setCelular(e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="9 dígitos" required/></label><label style={labelStyle}>Referencia<input style={inputStyle} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Piso, referencia (opcional)"/></label></div>{address && <p className="auto-location-help">{address}</p>}<div className="auto-actions"><button className="local-refresh" onClick={()=>setMapTarget('client')}>{lat && lng ? 'Ajustar ubicación en el mapa' : 'Elegir ubicación en el mapa'}</button></div>{shippingBusy?<p className="auto-shipping">Calculando ruta y envío…</p>:shipping?.permitido?<p className="auto-shipping">Delivery {money(shipping.costo!)} · {shipping.distancia_km.toFixed(2)} km</p>:shipping?<p className="auto-shipping">{shipping.razon==='SUPERA_DISTANCIA_MAXIMA'?`El cliente está a ${shipping.distancia_km.toFixed(1)} km. El máximo es 15 km.`:'No se pudo calcular una ruta real por calles. Intenta de nuevo más tarde.'}</p>:lat&&lng?<p className="auto-shipping">Calculando costo de envío…</p>:<p className="auto-location-help">Elige en el mapa el punto de entrega para calcular el precio.</p>}</div>
        </section>
      </div>
      <aside className="auto-summary"><h2>Resumen</h2><p className="auto-summary-local">Recojo: {data.restaurant.nombre} · {data.restaurant.celular || 'sin teléfono'}</p><p className="auto-summary-items">Entrega: {address || 'Selecciona el punto en el mapa'}</p><p className="auto-summary-items">Cliente: {celular || 'Ingresa su celular'}</p><p className="auto-summary-items">Referencia: {reference || 'Sin referencia'}</p><div className="auto-total"><span>Delivery</span><strong>{shipping?.costo != null?money(shipping.costo):'No disponible'}</strong></div><button className="local-primary-button auto-submit" disabled={busy||!localReady||!clientReady||!shipping?.permitido} onClick={()=>void submit()}>{busy?'Registrando…':'Crear autopedido'}</button>{!shipping?.permitido&&clientReady&&shipping&&!shippingBusy&&<small className="auto-hint">Se necesita una ruta real de hasta 15 km.</small>}{!localReady&&<small className="auto-hint">El restaurante debe tener ubicación guardada para calcular el delivery.</small>}</aside>
    </div>}
    {mapTarget && <MapPicker title={mapTarget === 'local' ? 'Ubica el local' : 'Ubica la dirección de entrega'} lat={Number(mapTarget === 'local' ? localLat : lat) || Number(data?.restaurant.lat) || -8.3791} lng={Number(mapTarget === 'local' ? localLng : lng) || Number(data?.restaurant.lng) || -74.5539} onClose={()=>void closeMap()} onSelect={(newLat,newLng)=>{ if(mapTarget==='local'){setLocalLat(newLat.toFixed(6));setLocalLng(newLng.toFixed(6))}else{setLat(newLat.toFixed(6));setLng(newLng.toFixed(6))} }}/>}
  </div>
}

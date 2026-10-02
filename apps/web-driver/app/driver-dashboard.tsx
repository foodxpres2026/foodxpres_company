'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DriverUser } from '@/lib/auth'
import PushNotifications from './push-notifications'

type Section = 'available' | 'current' | 'history'
type Item = { id: string; nombre_snapshot: string; cantidad: number; subtotal: number; notas: string | null }
type Order = {
  id: string; estado: string; subtotal: number | string; costo_envio: number | string; distancia_km: number | string | null
  tiempo_estimado: number | null; direccion_snapshot: { direccion?: string; etiqueta?: string; referencia?: string; lat?: number; lng?: number } | null
  creado_en: string; driver_asignado_en: string | null; driver_llego_en: string | null; listo_en: string | null
  driver_llego_cliente_en?: string | null
  recogido_en: string | null; entregado_en: string | null; pedido_codigo: string; pedido_notas: string | null
  entrega_reportada_en?: string | null; driver_comision_monto?: number | string | null
  restaurante_nombre: string; restaurante_direccion: string; restaurante_celular: string | null
  restaurante_lat: number | string | null; restaurante_lng: number | string | null
  cliente_nombre: string; cliente_celular: string | null; items: Item[]
}
const tabs: { id: Section; title: string }[] = [
  { id: 'available', title: 'Disponibles' }, { id: 'current', title: 'En curso' }, { id: 'history', title: 'Historial' },
]
const money = (value: number | string | null | undefined) => `S/ ${Number(value ?? 0).toFixed(2)}`
const phoneLink = (phone: string | null) => phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined
const whatsappLink = (phone: string | null, message: string) => {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.startsWith('51') ? digits : `51${digits}`}?text=${encodeURIComponent(message)}`
}
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

export default function DriverDashboard({ user }: { user: DriverUser }) {
  const [section, setSection] = useState<Section>('available')
  const [orders, setOrders] = useState<Order[]>([])
  const offset = useRef(0)
  const [hasMore, setHasMore] = useState(false)
  const [disponible, setDisponible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [refreshAt, setRefreshAt] = useState<Date | null>(null)
  const [commissionBalance, setCommissionBalance] = useState(0)
  const [overdueCommission, setOverdueCommission] = useState(0)

  const load = useCallback(async (target: Section, append = false, quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const nextOffset = append ? offset.current : 0
      const response = await fetch(`/api/driver/orders?section=${target}&offset=${nextOffset}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'No se pudieron cargar los pedidos')
      setOrders((previous) => append ? [...previous, ...result.data] : result.data)
      offset.current = result.nextOffset ?? result.data.length
      setHasMore(Boolean(result.hasMore))
      if (typeof result.disponible === 'boolean') setDisponible(result.disponible)
      if (Number.isFinite(Number(result.comisionPendiente))) setCommissionBalance(Number(result.comisionPendiente))
      if (Number.isFinite(Number(result.deudaVencida))) setOverdueCommission(Number(result.deudaVencida))
      setRefreshAt(new Date())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error de conexión')
    } finally { if (!quiet) setLoading(false) }
  }, [])

  useEffect(() => { void load(section) }, [section, load])
  useEffect(() => {
    if (section === 'history') return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy) void load(section, false, true)
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [section, load, busy])

  async function mutate(order: Order, endpoint: string, method: 'POST' | 'PATCH', body?: object) {
    setBusy(order.id); setError(''); setNotice('')
    try {
      const response = await fetch(endpoint, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'No se pudo actualizar el pedido')
      setNotice(method === 'POST' ? 'Pedido tomado. Ya aparece en “En curso”.' : body && 'accion' in body && body.accion === 'LLEGUE_CLIENTE' ? 'Llegada al cliente registrada. Cuando le entregues el pedido, marca el siguiente paso.' : body && 'accion' in body && body.accion === 'ENTREGUE' ? 'Entrega finalizada. El cliente podrá confirmar opcionalmente que recibió el pedido.' : 'Avance del pedido guardado.')
      if (method === 'POST') {
        setSection('current')
      } else {
        await load(section, false, true)
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(null) }
  }

  async function logout() {
    setBusy('logout')
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload() }
    finally { setBusy(null) }
  }

  async function toggleAvailability() {
    if (disponible === null || availabilityBusy) return
    setAvailabilityBusy(true); setError('')
    try {
      const response = await fetch('/api/driver/availability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disponible: !disponible }) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'No se pudo cambiar la disponibilidad')
      setDisponible(result.disponible)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setAvailabilityBusy(false) }
  }

  const heading = tabs.find((tab) => tab.id === section)?.title ?? 'Pedidos'

  return <main className="driver-shell">
    <header className="driver-topbar">
      <button className="menu-button" aria-label="Abrir menú" onClick={() => setDrawer(true)}>☰</button>
      <a className="brand" href="/" aria-label="FoodXpres Driver"><span className="brand-mark"><img src="/logo-mark.png" alt="" /></span><span>Food<span className="brand-accent">X</span>pres <small>DRIVER</small></span></a>
      <div className="top-user"><span className="online-dot" />{user.nombre.split(' ')[0]}<span className="driver-commission-balance">Debe {money(commissionBalance)}</span><button className="logout-link" onClick={logout} disabled={busy === 'logout'}>Salir</button></div>
    </header>

    <div className="driver-layout">
      <aside className={`driver-sidebar ${drawer ? 'is-open' : ''}`}>
        <div className="sidebar-profile"><div className="avatar">{user.nombre.slice(0, 1).toUpperCase()}</div><div><strong>{user.nombre}</strong><span>Repartidor FoodXpres</span></div><button className="drawer-close" onClick={() => setDrawer(false)} aria-label="Cerrar menú">×</button></div>
        <nav aria-label="Secciones de pedidos">{tabs.map((tab) => <button key={tab.id} className={`side-tab ${section === tab.id ? 'active' : ''}`} onClick={() => { setSection(tab.id); setDrawer(false) }}><span>{tab.id === 'available' ? '◈' : tab.id === 'current' ? '◷' : '↺'}</span>{tab.title}</button>)}</nav>
        <div className="sidebar-note"><span className="online-dot" /> Actualización automática cada 10 s</div>
        <button className="sidebar-logout" onClick={logout} disabled={busy === 'logout'}>Cerrar sesión</button>
      </aside>
      {drawer && <button className="drawer-backdrop" aria-label="Cerrar menú" onClick={() => setDrawer(false)} />}

      <section className="driver-content">
        <PushNotifications />
        <div className="content-heading"><div><p className="eyebrow">PANEL DEL REPARTIDOR</p><h1>{heading}</h1><p className="subtitle">{section === 'available' ? 'Pedidos activos sin driver asignado. También puedes reservarlos mientras el local los prepara.' : section === 'current' ? 'Sigue los pasos del pedido hasta completar la entrega.' : 'Tus pedidos finalizados y su recorrido.'}</p></div>
          <div className="heading-actions">{section === 'available' && <button className={`availability ${disponible ? 'on' : 'off'}`} onClick={toggleAvailability} disabled={disponible === null || availabilityBusy}><i />{availabilityBusy ? 'Guardando...' : disponible ? 'Disponible · Desconectar' : 'Desconectado · Conectar'}</button>}<button className="refresh-button" onClick={() => void load(section)} disabled={loading}>↻ <span>Actualizar</span></button></div>
        </div>
        <div className="mobile-tabs">{tabs.map((tab) => <button key={tab.id} onClick={() => setSection(tab.id)} className={section === tab.id ? 'active' : ''}>{tab.title}{tab.id === section && <span>{orders.length}</span>}</button>)}</div>
        <div className="list-meta"><span>{section === 'history' ? `${orders.length} pedidos cargados` : `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}`}</span><span>Actualizado {refreshAt ? refreshAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span></div>
        {notice && <p className="notice" role="status">✓ {notice}</p>}
        {overdueCommission > 0 && <div className="error-panel" role="alert"><span>Tienes una deuda de comisión vencida por {money(overdueCommission)}. Ya pasaron 2 días desde que se generó; no podrás tomar nuevos pedidos hasta que administración registre tu pago.</span></div>}
        {error && <div className="error-panel" role="alert"><span>{error}</span><button onClick={() => void load(section)}>Reintentar</button></div>}
        {loading && orders.length === 0 ? <div className="empty-state"><div className="spinner"/><p>Cargando pedidos...</p></div> : orders.length === 0 && !error ? <div className="empty-state"><div className="empty-icon">{section === 'available' ? '✓' : section === 'current' ? '◷' : '↺'}</div><h2>{section === 'available' ? 'No hay pedidos sin driver' : section === 'current' ? 'No tienes pedidos en curso' : 'Aún no tienes pedidos en el historial'}</h2><p>{section === 'available' ? 'Aquí aparecerán los pedidos activos que todavía no tengan un driver asignado.' : 'Cuando haya actividad, la verás en este apartado.'}</p></div> : <div className="orders-grid">
          {orders.map((order) => <OrderCard key={order.id} order={order} driverName={user.nombre} section={section} canTake={disponible !== false && overdueCommission <= 0} takeBlockedLabel={overdueCommission > 0 ? 'Deuda vencida' : 'No disponible'} busy={busy === order.id} onTake={() => mutate(order, `/api/driver/orders/${order.id}/take`, 'POST')} onAction={(accion) => mutate(order, `/api/driver/orders/${order.id}/action`, 'PATCH', { accion })} />)}
        </div>}
        {hasMore && <button className="load-more" disabled={loading} onClick={() => void load(section, true)}>{loading ? 'Cargando...' : 'Cargar más pedidos'}</button>}
        <p className="content-footer">FoodXpres · Pucallpa</p>
      </section>
    </div>
  </main>
}

function OrderCard({ order, driverName, section, canTake, takeBlockedLabel, busy, onTake, onAction }: { order: Order; driverName: string; section: Section; canTake: boolean; takeBlockedLabel: string; busy: boolean; onTake: () => void; onAction: (action: 'LLEGUE' | 'RECOGI' | 'LLEGUE_CLIENTE' | 'ENTREGUE') => void }) {
  const [whatsappTarget, setWhatsappTarget] = useState<'restaurant' | 'customer' | null>(null)
  const address = order.direccion_snapshot?.direccion || 'Dirección de entrega no disponible'
  const customerAddress = [address, order.direccion_snapshot?.referencia].filter(Boolean).join(' · ')
  const waitingForLocal = ['PENDIENTE', 'ACEPTADO', 'PREPARANDO'].includes(order.estado) && !order.driver_llego_en
  const progress = order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' ? 4
    : order.estado === 'EN_CAMINO' ? order.driver_llego_cliente_en ? 3 : 2
    : order.driver_llego_en ? 1 : 0
  const localPoint = order.restaurante_lat != null && order.restaurante_lng != null ? `${Number(order.restaurante_lat)},${Number(order.restaurante_lng)}` : order.restaurante_direccion || order.restaurante_nombre
  const customerPoint = order.direccion_snapshot?.lat != null && order.direccion_snapshot?.lng != null ? `${Number(order.direccion_snapshot.lat)},${Number(order.direccion_snapshot.lng)}` : address
  const mapLink = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(localPoint)}&destination=${encodeURIComponent(customerPoint)}&travelmode=driving`
  const action = order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' ? 'ENTREGUE'
    : order.estado === 'EN_CAMINO'
      ? order.driver_llego_cliente_en ? 'ENTREGUE' : 'LLEGUE_CLIENTE'
      : order.driver_llego_en ? 'RECOGI' : 'LLEGUE'
  const actionLabel = order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' ? 'Finalizar entrega'
    : action === 'LLEGUE' ? 'Llegué al local' : action === 'RECOGI' ? 'Recibí los productos' : action === 'LLEGUE_CLIENTE' ? 'Llegué al cliente' : 'Entregué el pedido'
  const total = Number(order.subtotal) + Number(order.costo_envio)
  const statusLabel = order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' ? 'Esperando confirmación del cliente' : order.estado.replaceAll('_', ' ')
  return <article className="order-card">
    <div className="order-card-head"><div><span className="order-id">PEDIDO {order.pedido_codigo || order.id.slice(0, 8).toUpperCase()}</span><span className={`state-pill ${order.estado.toLowerCase()}`}>{statusLabel}</span></div><span className="order-date">{dateTime(order.driver_asignado_en ?? order.listo_en ?? order.creado_en)}</span></div>
    <div className="order-money"><div><span>Productos</span><strong>{money(order.subtotal)}</strong></div><div><span>Costo de envío</span><strong>{money(order.costo_envio)}</strong></div><div className="money-total"><span>Total pedido</span><strong>{money(total)}</strong></div></div>
    <div className="place-row"><span className="place-icon">⌂</span><div className="place-body"><strong>{order.restaurante_nombre}</strong><span>{order.restaurante_direccion || 'Dirección no disponible'}</span><div className="contact-links">{order.restaurante_celular && <><a href={phoneLink(order.restaurante_celular)}>Llamar · {order.restaurante_celular}</a><button type="button" className="whatsapp-link" onClick={() => setWhatsappTarget('restaurant')}>WhatsApp</button></>}</div></div></div>
    <div className="place-row"><span className="place-icon customer">●</span><div className="place-body"><strong>{order.cliente_nombre}</strong><span>{customerAddress}</span><div className="contact-links">{order.cliente_celular && <><a href={phoneLink(order.cliente_celular)}>Llamar · {order.cliente_celular}</a><button type="button" className="whatsapp-link" onClick={() => setWhatsappTarget('customer')}>WhatsApp</button></>}</div></div></div>
    {!!order.items.length && <div className="items-box"><strong>Detalle del pedido</strong>{order.items.map((item) => <div className="item-line" key={item.id}><span>{item.cantidad} × {item.nombre_snapshot}</span><span>{money(item.subtotal)}</span>{item.notas && <small>{item.notas}</small>}</div>)}</div>}
    {order.pedido_notas && <p className="order-note"><strong>Nota:</strong> {order.pedido_notas}</p>}
    {section === 'current' && (order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' ? <div className="waiting-local">Este pedido estaba esperando la confirmación del cliente. Puedes finalizarlo para continuar trabajando; el cliente aún podrá confirmar después.</div> : waitingForLocal ? <div className="waiting-local">Pedido reservado. Esperando que el local lo acepte y lo prepare.</div> : <div className="timeline"><div className="timeline-steps"><span className="done">Pedido tomado</span><span className={progress >= 1 ? 'done' : ''}>Llegada al local</span><span className={progress >= 2 ? 'done' : ''}>En camino</span><span className={progress >= 3 ? 'done' : ''}>Llegada al cliente</span><span className={progress >= 4 ? 'done' : ''}>Entrega reportada</span></div><div className="timeline-track"><i style={{ width: `${[7, 25, 45, 65, 85][progress]}%` }} /></div><div className="timeline-dates"><span>Tomado: {dateTime(order.driver_asignado_en)}</span><span>{order.driver_llego_en ? `Llegada al local: ${dateTime(order.driver_llego_en)}` : `Listo desde: ${dateTime(order.listo_en)}`}</span>{order.recogido_en && <span>Recogido: {dateTime(order.recogido_en)}</span>}{order.driver_llego_cliente_en && <span>Llegada al cliente: {dateTime(order.driver_llego_cliente_en)}</span>}</div></div>)}
    {section === 'history' && <div className="history-stamps"><span>Pedido tomado: {dateTime(order.driver_asignado_en)}</span>{order.driver_llego_en && <span>Llegaste al local: {dateTime(order.driver_llego_en)}</span>}{order.recogido_en && <span>Recogido: {dateTime(order.recogido_en)}</span>}{order.driver_llego_cliente_en && <span>Llegaste al cliente: {dateTime(order.driver_llego_cliente_en)}</span>}{order.entrega_reportada_en && <span>Reportaste la entrega: {dateTime(order.entrega_reportada_en)}</span>}{order.entregado_en && <span>Entrega confirmada: {dateTime(order.entregado_en)}</span>}{order.driver_comision_monto != null && <span>Comisión del pedido: {money(order.driver_comision_monto)} (solo delivery)</span>}</div>}
    <div className="order-card-foot"><a className="map-link" href={mapLink} target="_blank" rel="noreferrer">↗ Ruta: local → cliente</a>{section === 'available' && <button className="primary-action" onClick={onTake} disabled={busy || !canTake}>{busy ? 'Tomando pedido...' : canTake ? 'Tomar pedido' : takeBlockedLabel}</button>}{section === 'current' && (!waitingForLocal || (['ACEPTADO', 'PREPARANDO'].includes(order.estado) && action === 'LLEGUE')) && <button className="primary-action" onClick={() => onAction(action)} disabled={busy}>{busy ? 'Guardando...' : actionLabel}</button>}</div>
    {whatsappTarget && <WhatsAppMessageModal key={`${order.id}-${whatsappTarget}`} order={order} driverName={driverName} target={whatsappTarget} onClose={() => setWhatsappTarget(null)} />}
  </article>
}

type MessageTarget = 'restaurant' | 'customer'
type MessageTemplate = { id: string; title: string; description: string; message: (order: Order, driverName: string) => string }

function WhatsAppMessageModal({ order, driverName, target, onClose }: { order: Order; driverName: string; target: MessageTarget; onClose: () => void }) {
  const orderCode = order.pedido_codigo || order.id.slice(0, 8).toUpperCase()
  const templates: MessageTemplate[] = target === 'restaurant' ? [
    { id: 'pending', title: 'Pedido pendiente de aceptar', description: 'Avisar al local para que revise el pedido.', message: (o, driver) => `Buenas, equipo de ${o.restaurante_nombre} 👋\nSoy ${driver}, repartidor de FoodXpres. El pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()} de ${o.cliente_nombre} aún figura pendiente de aceptación. ¿Podrían revisarlo cuando tengan un momento para evitar demoras? Muchas gracias.` },
    { id: 'arrived', title: 'Llegué al restaurante', description: 'Avisar que el driver ya está esperando.', message: (o, driver) => `Buenas, equipo de ${o.restaurante_nombre} 👋\nSoy ${driver}, repartidor de FoodXpres. Ya llegué al local para recoger el pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()} de ${o.cliente_nombre}. Quedo atento a que esté listo. ¡Gracias!` },
    { id: 'ready', title: 'Consulta si está listo', description: 'Preguntar por el estado de preparación.', message: (o, driver) => `Hola, equipo de ${o.restaurante_nombre} 👋\nSoy ${driver}, repartidor asignado al pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()} de ${o.cliente_nombre}. ¿Me confirman, por favor, si ya está listo para recoger? Gracias.` },
  ] : [
    { id: 'arrived-restaurant', title: 'Llegué al restaurante', description: 'Contar al cliente que estás esperando su pedido.', message: (o, driver) => `Hola, ${o.cliente_nombre} 👋\nSoy ${driver}, repartidor de FoodXpres. Ya llegué a ${o.restaurante_nombre} para recoger tu pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()}. Estoy esperando que el local me lo entregue; te avisaré apenas salga hacia tu dirección. 🛵` },
    { id: 'on-the-way', title: 'Pedido en camino', description: 'Avisar que saliste del restaurante.', message: (o, driver) => `Hola, ${o.cliente_nombre} 👋\nSoy ${driver}, repartidor de FoodXpres. Ya recogí tu pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()} de ${o.restaurante_nombre} y voy en camino a tu dirección. ¡Nos vemos pronto! 🛵` },
    { id: 'arrived-customer', title: 'Llegué a tu ubicación', description: 'Avisar que estás en la dirección de entrega.', message: (o, driver) => `Hola, ${o.cliente_nombre} 👋\nSoy ${driver}, repartidor de FoodXpres. Ya llegué a la dirección que indicaste para el pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()}. Estoy aquí para entregártelo; avísame si necesitas que te llame o si debo ubicar alguna referencia. 📍` },
    { id: 'unavailable', title: 'Producto no disponible', description: 'Informar el inconveniente y la cancelación prevista.', message: (o, driver) => `Hola, ${o.cliente_nombre}. Soy ${driver}, repartidor de FoodXpres. El local ${o.restaurante_nombre} me informó que un producto de tu pedido ${o.pedido_codigo || o.id.slice(0, 8).toUpperCase()} no está disponible. Por ese motivo, el pedido será cancelado. Lamento mucho el inconveniente; puedes coordinar cualquier consulta directamente con el local.` },
  ]
  const [selectedId, setSelectedId] = useState(templates[0].id)
  const [message, setMessage] = useState(() => templates[0].message(order, driverName))
  const template = templates.find((item) => item.id === selectedId) ?? templates[0]
  const phone = target === 'restaurant' ? order.restaurante_celular : order.cliente_celular
  const recipient = target === 'restaurant' ? order.restaurante_nombre : order.cliente_nombre
  function chooseTemplate(id: string) {
    const next = templates.find((item) => item.id === id)
    if (!next) return
    setSelectedId(id)
    setMessage(next.message(order, driverName))
  }
  function send() {
    const link = whatsappLink(phone, message)
    if (!link || !message.trim()) return
    window.open(link, '_blank', 'noopener,noreferrer')
    onClose()
  }
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <div className="whatsapp-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="whatsapp-modal" role="dialog" aria-modal="true" aria-labelledby={`whatsapp-title-${order.id}`}>
      <header><div className="whatsapp-modal-icon">✉</div><div><h2 id={`whatsapp-title-${order.id}`}>Mensaje por WhatsApp</h2><p>Para {recipient} · Pedido {orderCode}</p></div><button type="button" className="whatsapp-modal-close" onClick={onClose} aria-label="Cerrar">×</button></header>
      <label className="whatsapp-template-label" htmlFor={`whatsapp-template-${order.id}`}>Elige un mensaje</label>
      <select id={`whatsapp-template-${order.id}`} value={selectedId || template.id} onChange={(event) => chooseTemplate(event.target.value)}>{templates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <p className="whatsapp-template-description">{template.description}</p>
      <label className="whatsapp-template-label" htmlFor={`whatsapp-message-${order.id}`}>Vista previa · puedes editarlo</label>
      <textarea id={`whatsapp-message-${order.id}`} value={message} onChange={(event) => setMessage(event.target.value)} rows={7} maxLength={1500} />
      <div className="whatsapp-modal-meta"><span>Se abrirá WhatsApp con {phone}</span><span>{message.length}/1500</span></div>
      <footer><button type="button" className="whatsapp-cancel" onClick={onClose}>Cancelar</button><button type="button" className="whatsapp-send" onClick={send} disabled={!message.trim()}>Abrir WhatsApp <span>↗</span></button></footer>
    </section>
  </div>
}

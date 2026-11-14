'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LocalUser } from '@/lib/auth'
import { playPushSound } from '@/lib/push/sound'
import AutopedidosPanel from './autopedidos-panel'
import PushNotifications from './push-notifications'
import ThemeToggle from './theme-toggle'

type SharedLocation = { lat: number; lng: number }

type Section = 'active' | 'history'
type OrderOption = { grupo: string; opcion: string; precio_extra: number | string }
type OrderItem = { id: string; nombre_snapshot: string; cantidad: number; subtotal: number | string; notas: string | null; opciones: OrderOption[] }
type Order = {
  id: string; estado: string; subtotal: number | string; costo_envio: number | string; tiempo_estimado: number | null
  metodo_pago?: 'EFECTIVO' | 'YAPE' | 'PLIN'; paga_con?: number | string | null; propina?: number | string; vip?: boolean; costo_vip?: number | string
  notas_local: string | null; notas_pedido: string | null; motivo_rechazo: string | null
  creado_en: string; aceptado_en: string | null; listo_en: string | null; entregado_en: string | null; entrega_cerrada_local_en: string | null
  direccion_snapshot: { direccion?: string; referencia?: string; etiqueta?: string; celular?: string } | null
  pedido_codigo: string; pedido_total: number | string; cliente_nombre: string; cliente_celular: string; cliente_pedidos_total: number
  restaurante_celular?: string | null; restaurante_direccion?: string | null
  restaurante_nombre?: string | null
  driver_nombre: string | null; driver_celular: string | null
  autopedido_propio: boolean
  items: OrderItem[]
}
const sections: { id: Section; label: string }[] = [
  { id: 'active', label: 'Pedidos' }, { id: 'history', label: 'Historial' },
]
const boardColumns = [
  { id: 'pending', label: 'Por aceptar', icon: '⏳', states: ['PENDIENTE'] },
  { id: 'preparing', label: 'En preparación', icon: '👨‍🍳', states: ['ACEPTADO', 'PREPARANDO'] },
  { id: 'ready', label: 'Listos', icon: '🍽️', states: ['LISTO'] },
  { id: 'delivery', label: 'En camino', icon: '🛵', states: ['ASIGNADO', 'EN_CAMINO', 'EN_CLIENTE', 'ENTREGA_PENDIENTE_CONFIRMACION'] },
] as const
const historyStates = ['ENTREGADO', 'RECHAZADO', 'CANCELADO']
const money = (amount: number | string) => `S/ ${Number(amount ?? 0).toFixed(2)}`
const timeAgo = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `hace ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}
const sectionMatches: Record<Section, string[]> = {
  active: ['PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO', 'EN_CLIENTE', 'ENTREGA_PENDIENTE_CONFIRMACION'],
  history: historyStates,
}
const stateLabel: Record<string, string> = {
  PENDIENTE: 'Por aceptar', ACEPTADO: 'Aceptado', PREPARANDO: 'En preparación', LISTO: 'Listo',
  ASIGNADO: 'Driver asignado', EN_CAMINO: 'En camino', EN_CLIENTE: 'Driver llegó al cliente', ENTREGA_PENDIENTE_CONFIRMACION: 'Esperando confirmación del cliente', ENTREGADO: 'Entregado', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado',
}

export default function LocalDashboard({ user }: { user: LocalUser }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [section, setSection] = useState<Section>('active')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshAt, setRefreshAt] = useState<Date | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [commissionBalance, setCommissionBalance] = useState<number | null>(null)
  const [showCommissionBalance, setShowCommissionBalance] = useState(false)
  const [sharedLocation, setSharedLocation] = useState<SharedLocation | null>(null)
  const [sharedLocationError, setSharedLocationError] = useState(false)
  const pendingSoundTimes = useRef(new Map<string, number>())
  const pendingIds = useRef(new Set<string>())
  const firstOrdersLoad = useRef(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('autopedido') !== '1') return
    const coordinates = params.get('ubicacionCompartida')?.split(',').map(Number)
    if (coordinates?.length === 2 && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1]) && Math.abs(coordinates[0]) <= 90 && Math.abs(coordinates[1]) <= 180) {
      setSharedLocation({ lat: coordinates[0], lng: coordinates[1] })
      setSharedLocationError(false)
    } else {
      setSharedLocationError(params.get('errorUbicacionCompartida') === '1')
    }
    setAutoMode(true)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const loadCommissionBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/local/commission-balance', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.ok) setCommissionBalance(Number(result.data.saldo ?? 0))
    } catch { /* El balance no debe impedir operar los pedidos. */ }
  }, [])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/local/orders', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'No se pudieron cargar los pedidos')
      setOrders(result.data)
      setRefreshAt(new Date())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { if (!quiet) setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const currentPending = new Set(orders.filter((order) => order.estado === 'PENDIENTE').map((order) => order.id))
    pendingIds.current = currentPending

    if (firstOrdersLoad.current) {
      firstOrdersLoad.current = false
      for (const id of currentPending) pendingSoundTimes.current.set(id, Date.now())
      return
    }

    for (const id of currentPending) {
      if (pendingSoundTimes.current.has(id)) continue
      pendingSoundTimes.current.set(id, Date.now())
      playPushSound()
    }
    for (const id of pendingSoundTimes.current.keys()) {
      if (!currentPending.has(id)) pendingSoundTimes.current.delete(id)
    }
  }, [orders])
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      for (const [id, lastPlayedAt] of pendingSoundTimes.current) {
        if (!pendingIds.current.has(id) || now - lastPlayedAt < 5 * 60_000) continue
        playPushSound()
        pendingSoundTimes.current.set(id, now)
      }
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => { void loadCommissionBalance() }, [loadCommissionBalance])
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy) {
        void loadCommissionBalance()
        if (section !== 'history') void load(true)
      }
    }, section === 'history' ? 30_000 : 15_000)
    return () => window.clearInterval(timer)
  }, [section, busy, load, loadCommissionBalance])

  const counts = useMemo(() => Object.fromEntries(sections.map(({ id }) => [id, orders.filter((order) => sectionMatches[id].includes(order.estado)).length])) as Record<Section, number>, [orders])
  const visibleOrders = useMemo(() => orders.filter((order) => sectionMatches[section].includes(order.estado)), [orders, section])

  async function act(order: Order, accion: 'ACEPTAR' | 'RECHAZAR' | 'LISTO', tiempoEstimado = 30, motivo?: string) {
    setBusy(order.id); setError(''); setNotice('')
    try {
      const body = accion === 'ACEPTAR' ? { accion, tiempo_estimado: tiempoEstimado } : accion === 'RECHAZAR' ? { accion, motivo: motivo?.trim() || null } : { accion }
      const response = await fetch(`/api/local/orders/${order.id}/action`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'No se pudo actualizar el pedido')
      setNotice(accion === 'ACEPTAR' ? 'Pedido aceptado.' : accion === 'RECHAZAR' ? 'Pedido rechazado.' : 'Pedido marcado como listo.')
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(null) }
  }

  async function logout() {
    setBusy('logout')
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload() }
    finally { setBusy(null) }
  }

  async function confirmAutopedido(order: Order) {
    setBusy(order.id); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/local/orders/${order.id}/confirm-delivery`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo confirmar la entrega')
      setNotice('Autopedido confirmado como recibido. Se registró la comisión correspondiente.')
      await Promise.all([load(true), loadCommissionBalance()])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(null) }
  }

  const activeTotal = counts.active
  const title = sections.find((tab) => tab.id === section)?.label ?? 'Pedidos'

  return <main className="local-shell">
    <header className="local-topbar">
      <button className="local-menu-button" onClick={() => setDrawer(true)} aria-label="Abrir menú">☰</button>
      <a className="local-brand" href="/" aria-label="FOODXPRES Local"><span className="local-brand-mark"><img src="/logo-mark.png" alt=""/></span><span>FOOD<span>X</span>PRES <small>LOCAL</small></span></a>
      <div className="local-top-profile"><span className="local-online-dot"/><span className="local-top-name">{user.restauranteNombre}</span><ThemeToggle /><button onClick={logout} disabled={busy === 'logout'}>Salir</button></div>
    </header>
    <div className="local-layout">
      <aside className={`local-sidebar ${drawer ? 'open' : ''}`}>
        <div className="local-profile"><div className="local-avatar">{user.restauranteNombre.slice(0, 1).toUpperCase()}</div><div><strong>{user.restauranteNombre}</strong><span>{user.nombre}</span></div><button className="local-drawer-close" onClick={() => setDrawer(false)} aria-label="Cerrar menú">×</button></div>
        <nav aria-label="Pedidos del local">{sections.map((tab) => <button key={tab.id} onClick={() => { setAutoMode(false); setSection(tab.id); setDrawer(false) }} className={`local-nav-item ${!autoMode && section === tab.id ? 'active' : ''}`}><span>{tab.id === 'active' ? '◷' : '↺'}</span>{tab.label}<b>{counts[tab.id]}</b></button>)}<button onClick={() => { setAutoMode(true); setDrawer(false) }} className={`local-nav-item ${autoMode ? 'active' : ''}`}><span>＋</span>Autopedidos</button></nav>
        <div className="local-sidebar-tools">
          <PushNotifications />
          <section className="local-commission-card"><div><span>Comisión pendiente</span><strong>{showCommissionBalance ? (commissionBalance === null ? '—' : money(commissionBalance)) : '••••••'}</strong></div><button type="button" className="local-balance-eye" onClick={() => setShowCommissionBalance((visible) => !visible)} aria-label={showCommissionBalance ? 'Ocultar comisión pendiente' : 'Mostrar comisión pendiente'} title={showCommissionBalance ? 'Ocultar saldo' : 'Mostrar saldo'}>{showCommissionBalance ? '🙈' : '👁️'}</button><button className="local-refresh" onClick={() => void loadCommissionBalance()}>↻ Actualizar saldo</button><a className="local-commission-report-link" href="/comisiones">▤ Ver reporte de comisiones</a></section>
        </div>
        <div className="local-sidebar-bottom"><span className="local-online-dot"/>Pedidos activos: {activeTotal}<button onClick={logout} disabled={busy === 'logout'}>Cerrar sesión</button></div>
      </aside>
      {drawer && <button className="local-backdrop" onClick={() => setDrawer(false)} aria-label="Cerrar menú"/>}
      <section className="local-content">
        <main className="local-orders-main">
            {notice && <div className="local-notice" role="status">✓ {notice}</div>}
            {error && <div className="local-error" role="alert"><span>{error}</span><button onClick={() => void load()}>Reintentar</button></div>}
            {autoMode ? <AutopedidosPanel sharedLocation={sharedLocation} sharedLocationError={sharedLocationError} onBack={() => { setAutoMode(false); setSharedLocation(null); setSharedLocationError(false) }} onCreated={() => { setSharedLocation(null); setSharedLocationError(false); setAutoMode(false); setSection('active'); setNotice('Autopedido creado y aceptado; ya está en Pedidos.'); void load(); void loadCommissionBalance() }} /> : <>
              <div className="local-page-heading"><div><p className="local-eyebrow">PANEL DEL LOCAL</p><h1>{title}</h1><p>Pedidos normales y autopedidos, organizados por estado.</p></div><button className="local-refresh" onClick={() => { void load(); void loadCommissionBalance() }} disabled={loading}>↻ <span>Actualizar</span></button></div>
              <div className="local-mobile-tabs">{sections.map((tab) => <button key={tab.id} onClick={() => setSection(tab.id)} className={section === tab.id ? 'active' : ''}>{tab.label}<span>{counts[tab.id]}</span></button>)}</div>
              <div className="local-list-meta"><span>{visibleOrders.length} {visibleOrders.length === 1 ? 'pedido' : 'pedidos'}</span><span>Actualizado {refreshAt ? refreshAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'} · {section === 'active' ? 'Auto cada 15 s' : 'Actualización manual'}</span></div>
              {loading && orders.length === 0 ? <div className="local-empty"><i className="local-spinner"/><p>Cargando pedidos…</p></div> : visibleOrders.length === 0 && !error ? <div className="local-empty"><div className="local-empty-icon">{section === 'active' ? '✓' : '↺'}</div><h2>{section === 'active' ? 'No hay pedidos activos' : 'No hay pedidos en el historial'}</h2><p>Los nuevos pedidos aparecerán aquí automáticamente.</p></div> : section === 'active' ? <div className="local-kanban">{boardColumns.map((column) => {
                const columnOrders = visibleOrders.filter((order) => (column.states as readonly string[]).includes(order.estado))
                return <section className="local-kanban-column" key={column.id} aria-label={column.label}>
                  <header className="local-kanban-head"><div><span>{column.icon}</span><h2>{column.label}</h2></div><b>{columnOrders.length}</b></header>
                  <div className="local-kanban-list">{columnOrders.length === 0 ? <p className="local-kanban-empty">Sin pedidos</p> : columnOrders.map((order) => <LocalOrderCard key={order.id} order={order} busy={busy === order.id} onAccept={(minutes) => void act(order, 'ACEPTAR', minutes)} onReject={(reason) => void act(order, 'RECHAZAR', 30, reason)} onReady={() => void act(order, 'LISTO')} onConfirm={() => void confirmAutopedido(order)} />)}</div>
                </section>
              })}</div> : <div className="local-orders-grid">{visibleOrders.map((order) => <LocalOrderCard key={order.id} order={order} busy={busy === order.id} onConfirm={() => void confirmAutopedido(order)} />)}</div>}
            </>}
        </main>
      </section>
    </div>
  </main>
}

function LocalOrderCard({ order, busy, onAccept, onReject, onReady, onConfirm }: { order: Order; busy: boolean; onAccept?: (minutes: number) => void; onReject?: (reason: string) => void; onReady?: () => void; onConfirm: () => void }) {
  const [prepMinutes, setPrepMinutes] = useState(30)
  const [rejectReason, setRejectReason] = useState('')
  const isAutopedido = order.direccion_snapshot?.etiqueta?.toLowerCase() === 'autopedido'
  const canConfirmOwnDelivery = order.autopedido_propio && (order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' || (order.estado === 'ENTREGADO' && !order.entrega_cerrada_local_en))

  return <article className={`local-order-card ${isAutopedido ? 'autopedido-card' : 'normal-order-card'}`}>
    <div className="local-order-card-head"><div><span className="local-order-code">#{order.pedido_codigo}</span><span className={`local-state ${order.estado.toLowerCase()}`}>{stateLabel[order.estado] ?? order.estado}</span></div><time>{timeAgo(order.creado_en)}</time></div>
    <div className="local-ticket-row"><button type="button" onClick={() => printLocalTicket(order)}>Imprimir / guardar ticket PDF</button></div>
    <div className="local-order-kind">{isAutopedido ? 'AUTOPEDIDO' : `Cliente · ${order.cliente_nombre}`}</div>
    {!isAutopedido && <div className="local-customer-history"><span>{order.cliente_pedidos_total} {order.cliente_pedidos_total === 1 ? 'pedido' : 'pedidos'} en FOODXPRES</span>{order.cliente_pedidos_total === 1 && <strong>Cliente nuevo</strong>}</div>}
    {!isAutopedido && order.tiempo_estimado != null && <p className="local-order-prep-time">Preparación estimada · {order.tiempo_estimado} min</p>}
    {isAutopedido ? <div className="local-order-customer-info"><a href={`tel:${order.cliente_celular}`}>☎ {order.cliente_celular || 'Sin celular'}</a><span>📍 {order.direccion_snapshot?.direccion || 'Dirección no disponible'}</span>{order.direccion_snapshot?.referencia && <small>Ref.: {order.direccion_snapshot.referencia}</small>}</div> : <div className="local-order-items">{order.items.length ? order.items.map((item) => <div className="local-order-item" key={item.id}>
      <div className="local-order-item-line"><strong><b>{item.cantidad} ×</b> {item.nombre_snapshot}</strong><strong>{money(item.subtotal)}</strong></div>
      {item.opciones?.map((option, index) => <small key={`${item.id}-${index}`}>{option.grupo}: {option.opcion}{Number(option.precio_extra) > 0 ? ` (+${money(option.precio_extra)})` : ''}</small>)}
      {item.notas && <small>Nota: {item.notas}</small>}
    </div>) : <p className="local-order-no-items">Sin productos en este pedido.</p>}
    {(order.notas_pedido || order.notas_local) && <div className="local-order-note"><strong>Nota del pedido</strong><span>{order.notas_pedido || order.notas_local}</span></div>}
    {order.notas_pedido && order.notas_local && order.notas_pedido !== order.notas_local && <div className="local-order-note"><strong>Nota del local</strong><span>{order.notas_local}</span></div>}
    {order.motivo_rechazo && <div className="local-order-note"><strong>Motivo de rechazo</strong><span>{order.motivo_rechazo}</span></div>}
    <div className="local-order-amount"><span>Total de productos</span><strong>{money(order.subtotal)}</strong></div></div>}
    {isAutopedido && <div className="local-order-amount delivery-pay"><span>Pago del delivery</span><strong>{money(order.costo_envio)}</strong></div>}
    {(order.driver_nombre || order.driver_celular) && <div className="local-order-driver"><strong>🛵 Driver asignado</strong><span>{order.driver_nombre || 'Nombre no disponible'}</span>{order.driver_celular ? <a href={`tel:${order.driver_celular}`}>☎ {order.driver_celular}</a> : <small>Celular no disponible</small>}</div>}
    {order.estado === 'PENDIENTE' && onAccept && onReject && <div className="local-order-actions">
      <label>Tiempo de preparación<select value={prepMinutes} onChange={(event) => setPrepMinutes(Number(event.target.value))}><option value={15}>15 min</option><option value={20}>20 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></label>
      <button className="local-primary-button" onClick={() => onAccept(prepMinutes)} disabled={busy}>{busy ? 'Guardando…' : 'Aceptar pedido'}</button>
      <label className="local-reject-field">Motivo de rechazo<textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={200} placeholder="Escribe por qué se rechaza" required /></label>
      <button className="local-reject-button" onClick={() => onReject(rejectReason)} disabled={busy || !rejectReason.trim()}>{busy ? 'Guardando…' : 'Rechazar pedido'}</button>
    </div>}
    {['ACEPTADO', 'PREPARANDO'].includes(order.estado) && onReady && <button className="local-primary-button local-ready-button" onClick={onReady} disabled={busy}>{busy ? 'Guardando…' : 'Marcar como listo'}</button>}
    {canConfirmOwnDelivery && <button className="local-primary-button local-ready-button" onClick={onConfirm} disabled={busy}>{busy ? 'Guardando…' : order.estado === 'ENTREGA_PENDIENTE_CONFIRMACION' ? 'Confirmar que recibí el pedido' : 'Confirmar recepción (opcional)'}</button>}
  </article>
}

function printLocalTicket(order: Order) {
  const popup = window.open('', '_blank', 'width=760,height=900')
  if (!popup) {
    window.alert('Permite las ventanas emergentes para imprimir o guardar el ticket.')
    return
  }
  const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
  const money = (value: number | string | null | undefined) => `S/ ${Number(value ?? 0).toFixed(2)}`
  const address = order.direccion_snapshot || {}
  const isAutopedido = address.etiqueta?.toLowerCase() === 'autopedido'
  const customerName = isAutopedido ? 'Autopedido' : order.cliente_nombre
  const customerPhone = isAutopedido ? address.celular || order.cliente_celular : order.cliente_celular
  const payment = order.metodo_pago === 'YAPE' ? 'Yape' : order.metodo_pago === 'PLIN' ? 'Plin' : 'Efectivo'
  const items = order.items.map((item) => `<li><div class="row"><span>${item.cantidad} × ${escape(item.nombre_snapshot)}</span><strong>${money(item.subtotal)}</strong></div>${item.opciones.map((option) => `<p class="detail">${escape(option.grupo)}: ${escape(option.opcion)}${Number(option.precio_extra) > 0 ? ` (+${money(option.precio_extra)})` : ''}</p>`).join('')}${item.notas ? `<p class="detail">Nota: ${escape(item.notas)}</p>` : ''}</li>`).join('')
  const localTotal = Number(order.subtotal) + Number(order.costo_envio)
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${escape(order.pedido_codigo)}</title><style>@page{size:80mm auto;margin:5mm}*{box-sizing:border-box}body{font:12px/1.4 Arial,sans-serif;color:#111;width:70mm;margin:0 auto}header{text-align:center;border-bottom:1px dashed #555;padding:0 0 10px;margin-bottom:10px}h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;margin:0 0 4px}p{margin:3px 0}.muted,.detail{color:#555;font-size:10px}.row{display:flex;justify-content:space-between;gap:8px}.row span{min-width:0}section{padding:8px 0;border-bottom:1px dashed #777}ul{list-style:none;padding:0;margin:7px 0}li{padding:5px 0;border-bottom:1px dotted #bbb}.detail{margin-left:8px}.grand{font-size:15px;font-weight:bold;border-top:1px solid #111;padding-top:8px;margin-top:8px}.center{text-align:center;margin-top:12px}@media screen{body{padding:16px}}</style></head><body><header><h1>FOODXPRES</h1><p>${escape(order.restaurante_nombre || 'Ticket de pedido')}</p>${order.restaurante_celular ? `<p>☎ ${escape(order.restaurante_celular)}</p>` : ''}${order.restaurante_direccion ? `<p>${escape(order.restaurante_direccion)}</p>` : ''}</header><section><div class="row"><strong>Pedido</strong><strong>${escape(order.pedido_codigo)}</strong></div><p>Fecha: ${escape(new Date(order.creado_en).toLocaleString('es-PE'))}</p><p>Estado: ${escape(stateLabel[order.estado] ?? order.estado)}</p><p>Cliente: ${escape(customerName)}</p><p>Celular: ${escape(customerPhone)}</p><p>Entrega: ${escape(address.direccion || 'Sin dirección')}${address.referencia ? ` · ${escape(address.referencia)}` : ''}</p><p>Pago: ${escape(payment)}</p>${order.metodo_pago === 'EFECTIVO' && order.paga_con != null ? `<p>Paga con: ${money(order.paga_con)}</p>` : ''}${order.notas_pedido || order.notas_local ? `<p>Nota: ${escape(order.notas_pedido || order.notas_local)}</p>` : ''}</section><section><h2>Productos</h2><ul>${items || '<li>Sin productos</li>'}</ul><div class="row"><span>Subtotal del local</span><strong>${money(order.subtotal)}</strong></div><div class="row"><span>Delivery asociado</span><strong>${money(order.costo_envio)}</strong></div><div class="row grand"><span>Total local</span><strong>${money(localTotal)}</strong></div></section><p class="center">Gracias por usar FOODXPRES</p><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))</script></body></html>`
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
}

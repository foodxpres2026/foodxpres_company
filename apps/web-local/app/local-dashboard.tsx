'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LocalUser } from '@/lib/auth'

type Section = 'pending' | 'preparing' | 'ready' | 'history'
type OrderItem = { id: string; nombre_snapshot: string; cantidad: number; subtotal: number | string; notas: string | null }
type Order = {
  id: string; estado: string; subtotal: number | string; costo_envio: number | string
  notas_local: string | null; notas_pedido: string | null; motivo_rechazo: string | null
  creado_en: string; aceptado_en: string | null; listo_en: string | null; entregado_en: string | null
  direccion_snapshot: { direccion?: string; referencia?: string; etiqueta?: string } | null
  pedido_codigo: string; pedido_total: number | string; cliente_nombre: string; cliente_celular: string
  items: OrderItem[]
}
const sections: { id: Section; label: string }[] = [
  { id: 'pending', label: 'Por aceptar' }, { id: 'preparing', label: 'En preparación' },
  { id: 'ready', label: 'Listos' }, { id: 'history', label: 'Historial' },
]
const money = (amount: number | string) => `S/ ${Number(amount ?? 0).toFixed(2)}`
const displayDate = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const sectionMatches: Record<Section, string[]> = {
  pending: ['PENDIENTE'], preparing: ['ACEPTADO', 'PREPARANDO'], ready: ['LISTO'],
  history: ['ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO'],
}
const stateLabel: Record<string, string> = {
  PENDIENTE: 'Por aceptar', ACEPTADO: 'Aceptado', PREPARANDO: 'En preparación', LISTO: 'Listo',
  ASIGNADO: 'Driver asignado', EN_CAMINO: 'En camino', ENTREGADO: 'Entregado', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado',
}

export default function LocalDashboard({ user }: { user: LocalUser }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [section, setSection] = useState<Section>('pending')
  const [selected, setSelected] = useState<Order | null>(null)
  const [estimate, setEstimate] = useState('30')
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshAt, setRefreshAt] = useState<Date | null>(null)
  const [drawer, setDrawer] = useState(false)

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
    if (section === 'history') return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy) void load(true)
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [section, busy, load])

  const counts = useMemo(() => Object.fromEntries(sections.map(({ id }) => [id, orders.filter((order) => sectionMatches[id].includes(order.estado)).length])) as Record<Section, number>, [orders])
  const visibleOrders = useMemo(() => orders.filter((order) => sectionMatches[section].includes(order.estado)), [orders, section])

  async function act(order: Order, accion: 'ACEPTAR' | 'RECHAZAR' | 'LISTO') {
    setBusy(order.id); setError(''); setNotice('')
    try {
      const body = accion === 'ACEPTAR' ? { accion, tiempo_estimado: Number(estimate) } : accion === 'RECHAZAR' ? { accion, motivo: rejectReason.trim() || null } : { accion }
      const response = await fetch(`/api/local/orders/${order.id}/action`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'No se pudo actualizar el pedido')
      setNotice(accion === 'ACEPTAR' ? 'Pedido aceptado.' : accion === 'RECHAZAR' ? 'Pedido rechazado.' : 'Pedido marcado como listo.')
      setSelected(null); setRejectReason('')
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(null) }
  }

  async function logout() {
    setBusy('logout')
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload() }
    finally { setBusy(null) }
  }

  const activeTotal = counts.pending + counts.preparing + counts.ready
  const title = sections.find((tab) => tab.id === section)?.label ?? 'Pedidos'

  return <main className="local-shell">
    <header className="local-topbar">
      <button className="local-menu-button" onClick={() => setDrawer(true)} aria-label="Abrir menú">☰</button>
      <a className="local-brand" href="/" aria-label="FoodXpres Local"><img src="/logo-mark.png" alt=""/><span>Food<span>X</span>pres <small>LOCAL</small></span></a>
      <div className="local-top-profile"><span className="local-online-dot"/><span className="local-top-name">{user.restauranteNombre}</span><button onClick={logout} disabled={busy === 'logout'}>Salir</button></div>
    </header>
    <div className="local-layout">
      <aside className={`local-sidebar ${drawer ? 'open' : ''}`}>
        <div className="local-profile"><div className="local-avatar">{user.restauranteNombre.slice(0, 1).toUpperCase()}</div><div><strong>{user.restauranteNombre}</strong><span>{user.nombre}</span></div><button className="local-drawer-close" onClick={() => setDrawer(false)} aria-label="Cerrar menú">×</button></div>
        <nav aria-label="Pedidos del local">{sections.map((tab) => <button key={tab.id} onClick={() => { setSection(tab.id); setDrawer(false) }} className={`local-nav-item ${section === tab.id ? 'active' : ''}`}><span>{tab.id === 'pending' ? '◷' : tab.id === 'preparing' ? '◉' : tab.id === 'ready' ? '✓' : '↺'}</span>{tab.label}<b>{counts[tab.id]}</b></button>)}</nav>
        <div className="local-sidebar-bottom"><span className="local-online-dot"/>Pedidos activos: {activeTotal}<button onClick={logout} disabled={busy === 'logout'}>Cerrar sesión</button></div>
      </aside>
      {drawer && <button className="local-backdrop" onClick={() => setDrawer(false)} aria-label="Cerrar menú"/>}
      <section className="local-content">
        <div className="local-page-heading"><div><p className="local-eyebrow">PANEL DEL LOCAL</p><h1>{title}</h1><p>Gestiona los pedidos de {user.restauranteNombre}.</p></div><button className="local-refresh" onClick={() => void load()} disabled={loading}>↻ <span>Actualizar</span></button></div>
        <div className="local-mobile-tabs">{sections.map((tab) => <button key={tab.id} onClick={() => setSection(tab.id)} className={section === tab.id ? 'active' : ''}>{tab.label}<span>{counts[tab.id]}</span></button>)}</div>
        <div className="local-list-meta"><span>{visibleOrders.length} {visibleOrders.length === 1 ? 'pedido' : 'pedidos'}</span><span>Actualizado {refreshAt ? refreshAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'} · Auto cada 15 s</span></div>
        {notice && <div className="local-notice" role="status">✓ {notice}</div>}
        {error && <div className="local-error" role="alert"><span>{error}</span><button onClick={() => void load()}>Reintentar</button></div>}
        {loading && orders.length === 0 ? <div className="local-empty"><i className="local-spinner"/><p>Cargando pedidos…</p></div> : visibleOrders.length === 0 && !error ? <div className="local-empty"><div className="local-empty-icon">{section === 'pending' ? '✓' : section === 'history' ? '↺' : '□'}</div><h2>{section === 'pending' ? 'No hay pedidos por aceptar' : `No hay pedidos en ${title.toLowerCase()}`}</h2><p>Los nuevos pedidos de tu local aparecerán aquí automáticamente.</p></div> : <div className="local-orders-grid">{visibleOrders.map((order) => <LocalOrderCard key={order.id} order={order} onDetails={() => { setSelected(order); setEstimate('30'); setRejectReason('') }} />)}</div>}
      </section>
    </div>
    {selected && <div className="local-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section className="local-modal" role="dialog" aria-modal="true" aria-labelledby="local-modal-title"><div className="local-modal-head"><div><span className={`local-state ${selected.estado.toLowerCase()}`}>{stateLabel[selected.estado] ?? selected.estado}</span><h2 id="local-modal-title">Pedido {selected.pedido_codigo}</h2></div><button onClick={() => setSelected(null)} aria-label="Cerrar detalle">×</button></div>
      <div className="local-detail-scroll"><div className="local-detail-summary"><span>Cliente<strong>{selected.cliente_nombre}</strong></span><span>Celular<strong>{selected.cliente_celular || 'No registrado'}</strong></span><span>Hora<strong>{displayDate(selected.creado_en)}</strong></span><span>Total<strong>{money(selected.pedido_total)}</strong></span></div>
      <div className="local-address"><strong>Entrega</strong><span>{selected.direccion_snapshot?.direccion || 'Dirección no disponible'}</span>{selected.direccion_snapshot?.referencia && <small>Referencia: {selected.direccion_snapshot.referencia}</small>}</div>
      <div className="local-detail-items"><h3>Productos</h3>{selected.items.map((item) => <div key={item.id}><span><b>{item.cantidad} ×</b> {item.nombre_snapshot}{item.notas && <small>{item.notas}</small>}</span><strong>{money(item.subtotal)}</strong></div>)}</div>
      {(selected.notas_pedido || selected.notas_local) && <div className="local-order-notes"><strong>Nota del pedido</strong><span>{selected.notas_pedido || selected.notas_local}</span></div>}
      {selected.motivo_rechazo && <div className="local-order-notes"><strong>Motivo del rechazo</strong><span>{selected.motivo_rechazo}</span></div>}
      <div className="local-total-line"><span>Productos</span><strong>{money(selected.subtotal)}</strong></div><div className="local-total-line"><span>Envío</span><strong>{money(selected.costo_envio)}</strong></div><div className="local-total-line grand"><span>Total del pedido</span><strong>{money(selected.pedido_total)}</strong></div></div>
      {selected.estado === 'PENDIENTE' && <div className="local-modal-actions"><label>Tiempo estimado de preparación<select value={estimate} onChange={(event) => setEstimate(event.target.value)}><option value="15">15 minutos</option><option value="20">20 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option></select></label><label>Motivo de rechazo (opcional)<textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={200} placeholder="Ej.: No tenemos este producto"/></label><div><button className="local-reject-button" onClick={() => void act(selected, 'RECHAZAR')} disabled={busy === selected.id}>Rechazar pedido</button><button className="local-primary-button" onClick={() => void act(selected, 'ACEPTAR')} disabled={busy === selected.id}>{busy === selected.id ? 'Guardando…' : 'Aceptar pedido'}</button></div></div>}
      {['ACEPTADO', 'PREPARANDO'].includes(selected.estado) && <div className="local-modal-actions"><button className="local-primary-button full" onClick={() => void act(selected, 'LISTO')} disabled={busy === selected.id}>{busy === selected.id ? 'Guardando…' : 'Marcar como listo'}</button></div>}
      </section></div>}
  </main>
}

function LocalOrderCard({ order, onDetails }: { order: Order; onDetails: () => void }) {
  return <article className="local-order-card"><div className="local-order-card-head"><div><span className="local-order-code">#{order.pedido_codigo}</span><span className={`local-state ${order.estado.toLowerCase()}`}>{stateLabel[order.estado] ?? order.estado}</span></div><time>{displayDate(order.creado_en)}</time></div><div className="local-customer"><strong>{order.cliente_nombre}</strong><span>{order.cliente_celular || 'Sin celular registrado'}</span></div><div className="local-order-preview">{order.items.slice(0, 3).map((item) => <span key={item.id}>{item.cantidad} × {item.nombre_snapshot}</span>)}{order.items.length > 3 && <small>y {order.items.length - 3} producto(s) más</small>}</div><div className="local-order-card-foot"><strong>{money(order.pedido_total)}</strong><button onClick={onDetails}>Ver detalle</button></div></article>
}

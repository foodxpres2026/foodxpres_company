'use client'

import { useCallback, useEffect, useState } from 'react'

type Rule = { id: string; modalidad: 'FIJA' | 'PORCENTAJE'; valor: number | string; creado_en: string }
type Local = { id: string; nombre: string; regla: Rule | null; saldo: string | number }
type Driver = { id: string; nombre: string; celular: string; saldo: string | number }
type Data = { restaurants: Local[]; drivers: Driver[]; driverRules: Rule[]; localRules: (Rule & { restaurante_id: string; restaurante_nombre: string })[]; charges: any[] }
type Beneficiary = { tipo: 'LOCAL' | 'DRIVER'; id: string; nombre: string; saldo: number }
const money = (value: number | string) => `S/ ${Number(value).toFixed(2)}`
const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

export default function ComisionesClient() {
  const [data, setData] = useState<Data | null>(null)
  const [localId, setLocalId] = useState('')
  const [mode, setMode] = useState<'FIJA' | 'PORCENTAJE'>('FIJA')
  const [value, setValue] = useState('0.50')
  const [driverValue, setDriverValue] = useState('10')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<any[]>([])
  const [selected, setSelected] = useState<Beneficiary | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/comisiones', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se cargaron las comisiones')
      const next = result.data as Data
      setData(next)
      setDriverValue(String(Number(next.driverRules[0]?.valor ?? 0)))
      if (!localId && next.restaurants.length) {
        setLocalId(next.restaurants[0].id)
        const current = next.restaurants[0].regla
        if (current) { setMode(current.modalidad); setValue(String(Number(current.valor))) }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
  }, [localId])

  useEffect(() => { void load() }, [load])
  const selectedLocal = data?.restaurants.find((local) => local.id === localId)

  async function saveRule(tipo: 'LOCAL' | 'DRIVER') {
    setBusy(true); setMessage(''); setError('')
    try {
      const response = await fetch('/api/comisiones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ beneficiario_tipo: tipo, restaurante_id: tipo === 'LOCAL' ? localId : null, modalidad: tipo === 'DRIVER' ? 'PORCENTAJE' : mode, valor: Number(tipo === 'DRIVER' ? driverValue : value) }) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo guardar')
      setMessage('Nueva regla guardada. Se aplicará a los pedidos creados desde ahora.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(false) }
  }

  async function openPayments(person: Beneficiary) {
    setSelected(person); setPayAmount(''); setPayNote(''); setError('')
    try {
      const response = await fetch(`/api/comisiones/pagos?tipo=${person.tipo}&id=${person.id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo cargar el historial')
      setPayments(result.data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
  }

  async function registerPayment() {
    if (!selected) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/comisiones/pagos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ beneficiario_tipo: selected.tipo, beneficiario_id: selected.id, monto: Number(payAmount), nota: payNote }) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo registrar el pago')
      setMessage(`Pago de ${money(payAmount)} registrado con fecha y administrador.`)
      setSelected(null)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
    finally { setBusy(false) }
  }

  if (!data && !error) return <p className="text-sm text-gray-500">Cargando...</p>
  return <div className="space-y-5">
    {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm text-brand">{message}</div>}
    {data && <>
      <section className="rounded-2xl border border-line bg-surface p-5 space-y-4">
        <div><h2 className="font-bold text-white">Comisión de drivers</h2><p className="mt-1 text-xs text-gray-500">Porcentaje sobre el costo de delivery del pedido. No incluye VIP ni propina.</p></div>
        <div className="flex flex-wrap items-end gap-3"><label className="text-xs text-gray-400">Porcentaje (%)<input className="mt-1 block w-36 rounded-lg border border-line-light bg-surface-dark px-3 py-2 text-white" type="number" min="0" max="100" step="0.01" value={driverValue} onChange={(e) => setDriverValue(e.target.value)} /></label><button disabled={busy} onClick={() => void saveRule('DRIVER')} className="rounded-lg bg-brand px-4 py-2 font-bold text-black disabled:opacity-50">Guardar nueva tasa</button></div>
        <div className="text-xs text-gray-500">Historial de tasas: {data.driverRules.length ? data.driverRules.map((rule) => <span key={rule.id} className="mr-3 inline-block">{Number(rule.valor)}% · {date(rule.creado_en)}</span>) : 'Aún no hay reglas. La tasa actual es 0%.'}</div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 space-y-3">
        <div><h2 className="font-bold text-white">Últimas comisiones generadas</h2><p className="mt-1 text-xs text-gray-500">Cada fila conserva la modalidad, tasa/base y monto del pedido en que se generó.</p></div>
        {data.charges.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="text-gray-500"><tr><th className="py-2">Pedido</th><th>Beneficiario</th><th>Base</th><th>Regla guardada</th><th>Monto</th><th>Fecha</th></tr></thead><tbody>{data.charges.map((charge) => <tr key={charge.id} className="border-t border-line text-gray-300"><td className="py-2">{charge.pedido_codigo}</td><td>{charge.beneficiario_nombre} · {charge.beneficiario_tipo === 'LOCAL' ? 'Local' : 'Driver'}</td><td>{money(charge.base)}</td><td>{charge.modalidad === 'FIJA' ? `${money(charge.valor_regla)} fijo` : `${Number(charge.valor_regla)}%`}</td><td className="font-bold text-brand">{money(charge.monto)}</td><td>{date(charge.creado_en)}</td></tr>)}</tbody></table></div> : <p className="text-xs text-gray-500">Aún no hay comisiones generadas.</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 space-y-4">
        <div><h2 className="font-bold text-white">Comisión de locales</h2><p className="mt-1 text-xs text-gray-500">Se calcula solo sobre el subtotal de productos. Puedes usar monto fijo por pedido o porcentaje.</p></div>
        <div className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto] md:items-end">
          <label className="text-xs text-gray-400">Local<select className="mt-1 block w-full rounded-lg border border-line-light bg-surface-dark px-3 py-2 text-white" value={localId} onChange={(e) => { const id = e.target.value; setLocalId(id); const rule = data.restaurants.find((item) => item.id === id)?.regla; if (rule) { setMode(rule.modalidad); setValue(String(Number(rule.valor))) } else { setMode('FIJA'); setValue('0.50') } }}><option value="">Selecciona un local</option>{data.restaurants.map((local) => <option key={local.id} value={local.id}>{local.nombre}</option>)}</select></label>
          <label className="text-xs text-gray-400">Modalidad<select className="mt-1 block w-full rounded-lg border border-line-light bg-surface-dark px-3 py-2 text-white" value={mode} onChange={(e) => setMode(e.target.value as 'FIJA' | 'PORCENTAJE')}><option value="FIJA">Soles por pedido</option><option value="PORCENTAJE">Porcentaje</option></select></label>
          <label className="text-xs text-gray-400">{mode === 'FIJA' ? 'Monto (S/)' : 'Porcentaje (%)'}<input className="mt-1 block w-full rounded-lg border border-line-light bg-surface-dark px-3 py-2 text-white" type="number" min="0" max={mode === 'PORCENTAJE' ? '100' : undefined} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} /></label>
          <button disabled={busy || !localId} onClick={() => void saveRule('LOCAL')} className="rounded-lg bg-brand px-4 py-2 font-bold text-black disabled:opacity-50">Guardar nueva regla</button>
        </div>
        {selectedLocal && <p className="text-xs text-gray-500">Regla actual: {selectedLocal.regla ? `${selectedLocal.regla.modalidad === 'FIJA' ? money(selectedLocal.regla.valor) + ' por pedido' : Number(selectedLocal.regla.valor) + '%'} · desde ${date(selectedLocal.regla.creado_en)}` : 'sin configurar (S/ 0.00)'}.</p>}
        {selectedLocal && <div><h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Historial de reglas · {selectedLocal.nombre}</h3><div className="space-y-1">{data.localRules.filter((rule) => rule.restaurante_id === selectedLocal.id).map((rule) => <p key={rule.id} className="text-xs text-gray-400">{rule.modalidad === 'FIJA' ? `${money(rule.valor)} por pedido` : `${Number(rule.valor)}% del subtotal`} · {date(rule.creado_en)}</p>)}{!data.localRules.some((rule) => rule.restaurante_id === selectedLocal.id) && <p className="text-xs text-gray-500">Sin cambios registrados.</p>}</div></div>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 space-y-4">
        <div><h2 className="font-bold text-white">Saldos pendientes y pagos</h2><p className="mt-1 text-xs text-gray-500">Solo se generan comisiones cuando el pedido queda entregado. Los pagos se guardan con fecha y usuario administrador.</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2"><h3 className="text-xs font-bold uppercase text-gray-500">Locales</h3>{data.restaurants.map((local) => <BalanceRow key={local.id} name={local.nombre} saldo={local.saldo} onPay={() => void openPayments({ tipo: 'LOCAL', id: local.id, nombre: local.nombre, saldo: Number(local.saldo) })} />)}</div>
          <div className="space-y-2"><h3 className="text-xs font-bold uppercase text-gray-500">Drivers</h3>{data.drivers.map((driver) => <BalanceRow key={driver.id} name={driver.nombre} saldo={driver.saldo} onPay={() => void openPayments({ tipo: 'DRIVER', id: driver.id, nombre: driver.nombre, saldo: Number(driver.saldo) })} />)}</div>
        </div>
      </section>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Registrar pago de comisión"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-surface p-5"><div className="mb-4 flex justify-between"><div><h2 className="font-bold text-white">Pago · {selected.nombre}</h2><p className="text-xs text-gray-400">Saldo pendiente: {money(selected.saldo)}</p></div><button onClick={() => setSelected(null)} aria-label="Cerrar" className="text-xl text-gray-400">×</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-gray-400">Monto pagado (S/)<input className="mt-1 block w-full rounded-lg border border-line-light bg-surface-dark px-3 py-2 text-white" type="number" min="0.01" max={selected.saldo} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></label><label className="text-xs text-gray-400">Nota o referencia<input className="mt-1 block w-full rounded-lg border border-line-light bg-surface-dark px-3 py-2 text-white" value={payNote} onChange={(e) => setPayNote(e.target.value)} maxLength={500} placeholder="Opcional" /></label></div><div className="mt-4"><h3 className="mb-2 text-xs font-bold text-gray-400">Últimos pagos</h3>{payments.length ? payments.map((payment) => <p key={payment.id} className="border-t border-line py-2 text-xs text-gray-300">{money(payment.monto)} · {date(payment.pagado_en)}{payment.nota ? ` · ${payment.nota}` : ''}{payment.admin_nombre ? ` · por ${payment.admin_nombre}` : ''}</p>) : <p className="text-xs text-gray-500">No hay pagos registrados.</p>}</div><button disabled={busy || !Number(payAmount) || Number(payAmount) > selected.saldo} onClick={() => void registerPayment()} className="mt-4 w-full rounded-lg bg-brand px-4 py-3 font-bold text-black disabled:opacity-50">{busy ? 'Guardando...' : 'Registrar pago'}</button></div></div>}
    </>}
  </div>
}

function BalanceRow({ name, saldo, onPay }: { name: string; saldo: string | number; onPay: () => void }) {
  const amount = Number(saldo)
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-dark p-3"><span className="min-w-0 truncate text-sm text-white">{name}</span><strong className={amount > 0 ? 'whitespace-nowrap text-amber-300' : 'whitespace-nowrap text-brand'}>{money(amount)}</strong><button disabled={amount <= 0} onClick={onPay} className="rounded-lg border border-line px-3 py-1.5 text-xs text-white disabled:opacity-40">Registrar pago</button></div>
}

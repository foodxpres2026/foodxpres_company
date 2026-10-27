'use client'

import { useEffect, useState } from 'react'

type Charge = { id: string; base: number | string; modalidad: 'FIJA' | 'PORCENTAJE'; valor_regla: number | string; monto: number | string; creado_en: string; pedido_codigo: string; tipo_pedido: string | null }
type Payment = { id: string; monto: number | string; nota: string | null; pagado_en: string; admin_nombre: string | null }
type Report = { local: { id: string; nombre: string }; charges: Charge[]; payments: Payment[]; total_comisiones: number; total_pagos: number; saldo: number; generado_en: string }
const money = (value: number | string) => `S/ ${Number(value ?? 0).toFixed(2)}`
const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function CommissionReport({ localId }: { localId: string }) {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!localId) { setError('No se seleccionó un local para el reporte.'); setLoading(false); return }
    void (async () => {
      try {
        const response = await fetch(`/api/comisiones/reporte?localId=${encodeURIComponent(localId)}`, { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo cargar el reporte.')
        setReport(result.data)
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
      finally { setLoading(false) }
    })()
  }, [localId])

  const chargeReason = (charge: Charge) => {
    const kind = charge.tipo_pedido === 'AUTOPEDIDO' ? 'autopedido' : 'pedido normal'
    return charge.modalidad === 'FIJA'
      ? `Cargo fijo de ${money(charge.valor_regla)} por ${kind}`
      : `Comisión ${Number(charge.valor_regla)}% del subtotal (${money(charge.base)}) · ${kind}`
  }

  return <div className="commission-report-page p-5 md:p-8">
    <style jsx global>{`@media print { @page { size: A4; margin: 14mm; } body:has(.commission-report) { background: #fff !important; color: #111 !important; } body:has(.commission-report) aside { display: none !important; } body:has(.commission-report) main { display: block !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; } .commission-report-page { padding: 0 !important; } .commission-report { max-width: none !important; color: #111 !important; background: #fff !important; border: 0 !important; box-shadow: none !important; } .commission-report * { color: #111 !important; border-color: #bbb !important; } .commission-report .print-hide { display: none !important; } .commission-report .overflow-x-auto { overflow: visible !important; } .commission-report table { min-width: 0 !important; } .commission-report tr { break-inside: avoid; } }`}</style>
    <div className="commission-report mx-auto max-w-5xl rounded-2xl border border-line bg-surface p-5 text-gray-200 md:p-8">
      <div className="print-hide mb-5 flex flex-wrap items-center justify-between gap-3"><a href="/dashboard/comisiones" className="text-sm text-brand hover:underline">← Volver a comisiones</a><button type="button" onClick={() => window.print()} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black">Imprimir / Guardar PDF</button></div>
      {loading ? <p className="text-sm text-gray-400">Cargando estado de cuenta…</p> : error ? <p role="alert" className="text-sm text-red-400">{error}</p> : report && <>
        <header className="mb-6 border-b border-line pb-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">FOODXPRES · ESTADO DE CUENTA</p><h1 className="mt-2 text-2xl font-bold text-white">Comisiones del local</h1><p className="mt-2 text-lg text-white">{report.local.nombre}</p><p className="mt-1 text-xs text-gray-400">Generado: {date(report.generado_en)}</p></header>
        <section className="mb-6 grid gap-3 sm:grid-cols-3"><Summary label="Comisiones generadas" value={report.total_comisiones}/><Summary label="Pagos registrados" value={report.total_pagos}/><Summary label="Saldo" value={report.saldo}/></section>
        <section className="mb-7"><h2 className="mb-3 text-base font-bold text-white">Cargos por pedido · normales y autopedidos</h2>{report.charges.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-line text-gray-400"><th className="py-2 pr-3">Fecha</th><th className="pr-3">Pedido</th><th className="pr-3">Tipo</th><th className="pr-3">Motivo / cálculo</th><th className="pr-3">Base</th><th className="pr-3">Cargo</th></tr></thead><tbody>{report.charges.map((charge) => <tr key={charge.id} className="border-b border-line/70"><td className="py-2 pr-3">{date(charge.creado_en)}</td><td className="pr-3 font-semibold">{charge.pedido_codigo}</td><td className="pr-3">{charge.tipo_pedido === 'AUTOPEDIDO' ? 'Autopedido' : 'Normal'}</td><td className="pr-3">{chargeReason(charge)}</td><td className="pr-3">{money(charge.base)}</td><td className="pr-3 font-bold text-brand">{money(charge.monto)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-400">Todavía no se generaron comisiones para este local.</p>}</section>
        <section><h2 className="mb-3 text-base font-bold text-white">Pagos registrados</h2>{report.payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-line text-gray-400"><th className="py-2 pr-3">Fecha</th><th className="pr-3">Monto</th><th className="pr-3">Nota / referencia</th><th>Registrado por</th></tr></thead><tbody>{report.payments.map((payment) => <tr key={payment.id} className="border-b border-line/70"><td className="py-2 pr-3">{date(payment.pagado_en)}</td><td className="pr-3 font-bold">{money(payment.monto)}</td><td className="pr-3">{payment.nota || '—'}</td><td>{payment.admin_nombre || 'Administrador'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-400">No hay pagos registrados.</p>}</section>
        <p className="mt-8 border-t border-line pt-4 text-right text-lg font-bold text-white">Saldo pendiente: <span className="text-brand">{money(report.saldo)}</span></p>
      </>}
    </div>
  </div>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-line-light bg-surface-dark p-4"><p className="text-xs text-gray-400">{label}</p><strong className="mt-1 block text-lg text-brand">{money(value)}</strong></div>
}

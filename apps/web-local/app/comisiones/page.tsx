'use client'

import { useEffect, useState } from 'react'

type Charge = { id: string; base: number | string; modalidad: 'FIJA' | 'PORCENTAJE'; valor_regla: number | string; monto: number | string; creado_en: string; pedido_codigo: string; tipo_pedido: string | null }
type Payment = { id: string; monto: number | string; nota: string | null; pagado_en: string; admin_nombre: string | null }
type Report = { local: { id: string; nombre: string }; charges: Charge[]; payments: Payment[]; total_comisiones: number; total_pagos: number; saldo: number; generado_en: string }
const money = (value: number | string) => `S/ ${Number(value ?? 0).toFixed(2)}`
const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function ComisionesReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/local/commission-report', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo cargar el reporte.')
        setReport(result.data)
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión') }
      finally { setLoading(false) }
    })()
  }, [])

  const chargeReason = (charge: Charge) => {
    const kind = charge.tipo_pedido === 'AUTOPEDIDO' ? 'autopedido' : 'pedido normal'
    return charge.modalidad === 'FIJA'
      ? `Cargo fijo de ${money(charge.valor_regla)} por ${kind}`
      : `Comisión ${Number(charge.valor_regla)}% del subtotal (${money(charge.base)}) · ${kind}`
  }

  return <main className="commission-report-page">
    <style jsx global>{`@media print { @page { size: A4; margin: 14mm; } body { background: #fff !important; color: #111 !important; } .local-shell, .local-layout, .local-content { min-height: 0 !important; height: auto !important; display: block !important; padding: 0 !important; background: #fff !important; } .local-topbar, .local-sidebar, .pwa-install-control { display: none !important; } .commission-report-page { padding: 0 !important; } .commission-report { max-width: none !important; color: #111 !important; background: #fff !important; border: 0 !important; box-shadow: none !important; } .commission-report * { color: #111 !important; border-color: #bbb !important; } .commission-report .print-hide { display: none !important; } .commission-report table { min-width: 0 !important; } .commission-report tr { break-inside: avoid; } }`}</style>
    <div className="commission-report">
      <div className="print-hide local-report-actions"><a href="/">← Volver a pedidos</a><button type="button" onClick={() => window.print()}>Imprimir / Guardar PDF</button></div>
      {loading ? <p>Cargando estado de cuenta…</p> : error ? <p role="alert">{error}</p> : report && <>
        <header className="local-report-header"><p>FOODXPRES · ESTADO DE CUENTA</p><h1>Comisiones del local</h1><h2>{report.local.nombre}</h2><span>Generado: {date(report.generado_en)}</span></header>
        <section className="local-report-summary"><Summary label="Comisiones generadas" value={report.total_comisiones}/><Summary label="Pagos registrados" value={report.total_pagos}/><Summary label="Saldo" value={report.saldo}/></section>
        <section className="local-report-section"><h2>Cargos por pedido · normales y autopedidos</h2>{report.charges.length ? <div className="local-report-overflow"><table><thead><tr><th>Fecha</th><th>Pedido</th><th>Tipo</th><th>Motivo / cálculo</th><th>Base</th><th>Cargo</th></tr></thead><tbody>{report.charges.map((charge) => <tr key={charge.id}><td>{date(charge.creado_en)}</td><td>{charge.pedido_codigo}</td><td>{charge.tipo_pedido === 'AUTOPEDIDO' ? 'Autopedido' : 'Normal'}</td><td>{chargeReason(charge)}</td><td>{money(charge.base)}</td><td>{money(charge.monto)}</td></tr>)}</tbody></table></div> : <p>Todavía no se generaron comisiones.</p>}</section>
        <section className="local-report-section"><h2>Pagos registrados</h2>{report.payments.length ? <div className="local-report-overflow"><table><thead><tr><th>Fecha</th><th>Monto</th><th>Nota / referencia</th><th>Registrado por</th></tr></thead><tbody>{report.payments.map((payment) => <tr key={payment.id}><td>{date(payment.pagado_en)}</td><td>{money(payment.monto)}</td><td>{payment.nota || '—'}</td><td>{payment.admin_nombre || 'Administrador'}</td></tr>)}</tbody></table></div> : <p>No hay pagos registrados.</p>}</section>
        <p className="local-report-total">Saldo pendiente: <strong>{money(report.saldo)}</strong></p>
      </>}
    </div>
  </main>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{money(value)}</strong></div>
}

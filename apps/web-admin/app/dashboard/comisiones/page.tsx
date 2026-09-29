import ComisionesClient from './comisiones-client'

export default function ComisionesPage() {
  return <div className="p-5 md:p-8 min-h-full max-w-6xl">
    <div className="mb-6"><h1 className="text-2xl md:text-3xl font-bold text-white">Comisiones y pagos</h1><p className="text-gray-500 text-sm mt-1">Configura las reglas y registra los pagos recibidos. Los pedidos conservan la regla vigente al crearse.</p></div>
    <ComisionesClient />
  </div>
}

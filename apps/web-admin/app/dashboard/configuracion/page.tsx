import ConfiguracionForm from './configuracion-form'

export default function ConfiguracionPage() {
  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Configuración
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Ajustes generales del sistema
        </p>
      </div>

      <ConfiguracionForm />
    </div>
  )
}
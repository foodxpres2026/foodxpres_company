// ============================================================
// HELPERS DE FECHAS CON TIMEZONE PERÚ
// ============================================================

const TZ = 'America/Lima'

export function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  })
}

export function formatearHora(fecha: string | Date): string {
  return new Date(fecha).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

export function formatearFechaHora(fecha: string | Date): string {
  return new Date(fecha).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

export function tiempoRelativo(fecha: string | Date): string {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const dias = Math.floor(hrs / 24)
  if (dias === 1) return 'Ayer'
  if (dias < 7) return `Hace ${dias} días`
  return formatearFecha(fecha)
}
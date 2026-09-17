// ============================================================
// Verifica si un restaurante está abierto en la hora actual
// ============================================================

const DIAS_MAP: Record<number, string> = {
  0: 'dom',
  1: 'lun',
  2: 'mar',
  3: 'mie',
  4: 'jue',
  5: 'vie',
  6: 'sab',
}

export interface HorarioDia {
  dia: string
  hora_apertura: string | null
  hora_cierre: string | null
}

export function estaAbierto(horarios: HorarioDia[]): boolean {
  if (!horarios || horarios.length === 0) return false

  // Hora actual en Perú (UTC-5)
  const ahora = new Date()
  const horaPeru = new Date(
    ahora.toLocaleString('en-US', { timeZone: 'America/Lima' })
  )

  const diaActual = DIAS_MAP[horaPeru.getDay()]
  const minutosActuales = horaPeru.getHours() * 60 + horaPeru.getMinutes()

  const horarioHoy = horarios.find((h) => h.dia === diaActual)
  if (!horarioHoy || !horarioHoy.hora_apertura || !horarioHoy.hora_cierre) {
    return false
  }

  const [hApertura, mApertura] = horarioHoy.hora_apertura.split(':').map(Number)
  const [hCierre, mCierre] = horarioHoy.hora_cierre.split(':').map(Number)

  const minApertura = hApertura * 60 + mApertura
  const minCierre = hCierre * 60 + mCierre

  // Si cierra después de medianoche (ej: 01:00)
  if (minCierre < minApertura) {
    return minutosActuales >= minApertura || minutosActuales <= minCierre
  }

  return minutosActuales >= minApertura && minutosActuales <= minCierre
}

// Devuelve el horario de hoy legible: "12:00 - 23:00" o null
export function horarioHoyTexto(horarios: HorarioDia[]): string | null {
  const ahora = new Date()
  const horaPeru = new Date(
    ahora.toLocaleString('en-US', { timeZone: 'America/Lima' })
  )
  const diaActual = DIAS_MAP[horaPeru.getDay()]
  const h = horarios.find((x) => x.dia === diaActual)

  if (!h || !h.hora_apertura || !h.hora_cierre) return null

  return `${h.hora_apertura.slice(0, 5)} - ${h.hora_cierre.slice(0, 5)}`
}
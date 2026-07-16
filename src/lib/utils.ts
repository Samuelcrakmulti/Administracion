export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '--'
  const parts = timeStr.split(':')
  const h = parts[0]
  const m = parts[1]
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

export function getCurrentDate(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export function getCurrentTime(): string {
  const d = new Date()
  return d.toTimeString().slice(0, 5)
}

export function turnoLabel(tipo: string): string {
  const map: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
  }
  return map[tipo] ?? tipo
}

export function estadoTurnoLabel(estado: string): string {
  const map: Record<string, string> = {
    abierto: 'En curso',
    pendiente_aprobacion: 'Pendiente aprobación',
    en_revision: 'En revisión',
    cerrado: 'Cerrado',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    con_diferencia: 'Con diferencia',
  }
  return map[estado] ?? estado
}

export function estadoTurnoColor(estado: string): string {
  const map: Record<string, string> = {
    abierto: 'badge-blue',
    pendiente_aprobacion: 'badge-amber',
    en_revision: 'badge-blue',
    cerrado: 'badge-slate',
    aprobado: 'badge-green',
    rechazado: 'badge-red',
  }
  return map[estado] ?? 'badge-slate'
}

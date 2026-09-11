export function formatPrice(amount: number): string {
  return `S/ ${amount.toFixed(2)}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isValidPeruPhone(phone: string): boolean {
  return /^9\d{8}$/.test(phone)
}

export function generateOrderCode(): string {
  return 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}
interface SkeletonProps {
  className?: string
  variant?: 'default' | 'circle' | 'text'
}

export default function Skeleton({
  className = '',
  variant = 'default',
}: SkeletonProps) {
  const base =
    'bg-surface-light/50 animate-pulse rounded-xl'

  if (variant === 'circle') {
    return <div className={`${base} rounded-full ${className}`} />
  }

  if (variant === 'text') {
    return (
      <div
        className={`h-3 bg-surface-light/50 animate-pulse rounded-full ${className}`}
      />
    )
  }

  return <div className={`${base} ${className}`} />
}

// ============================================
// SKELETON DE LISTA DE PEDIDOS
// ============================================
export function SkeletonPedido() {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="text" className="w-40 h-2.5" />
        </div>
        <div className="space-y-2 flex flex-col items-end">
          <Skeleton variant="text" className="w-16 h-4" />
          <Skeleton variant="text" className="w-20 h-2.5" />
        </div>
      </div>
      <Skeleton className="h-6 w-32" />
    </div>
  )
}

// ============================================
// SKELETON DE RESULTADO DE BÚSQUEDA
// ============================================
export function SkeletonResultado() {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4 flex gap-3">
      <Skeleton className="w-16 h-16 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2 h-2.5" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
    </div>
  )
}

// ============================================
// SKELETON DE RESTAURANTE EN CARD
// ============================================
export function SkeletonRestaurante() {
  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-32 rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2 h-2.5" />
      </div>
    </div>
  )
}
'use client'

import Link from 'next/link'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  icon?: string
  action?: { label: string; href: string }
}

interface ToastContextType {
  toast: (message: string, options?: { type?: 'success' | 'error' | 'info'; icon?: string; action?: Toast['action']; sound?: boolean }) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe estar dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(
    (message: string, options?: { type?: 'success' | 'error' | 'info'; icon?: string; action?: Toast['action']; sound?: boolean }) => {
      if (options?.sound) playAddSound()
      const nextToast = {
        id: Math.random().toString(36).substring(2, 9),
        message,
        type: options?.type || 'success',
        icon: options?.icon,
        action: options?.action,
      }
      setToasts((prev) => [
        ...prev.filter((item) => item.message !== message || item.type !== nextToast.type),
        nextToast,
      ].slice(-3))
    },
    []
  )

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* CONTENEDOR DE TOASTS */}
      <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const duration = toast.action ? 4000 : 2500

  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const colores: Record<string, string> = {
    success: 'bg-brand text-black',
    error: 'bg-danger text-white',
    info: 'bg-surface border border-brand text-white',
  }

  const className = `${colores[toast.type || 'success']} rounded-xl px-4 py-3 shadow-2xl font-bold text-sm flex items-center gap-3 pointer-events-auto animate-[slideUp_0.3s_ease-out] w-full max-w-sm h-14 box-border`

  if (toast.action) {
    return (
      <div role="status" className={className}>
        <Link href={toast.action.href} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`${toast.message}. ${toast.action.label}`}>
          {toast.icon && <span className="text-base flex-shrink-0">{toast.icon}</span>}
          <span className="flex-1 min-w-0 truncate">{toast.message}</span>
          <span className="text-xs underline underline-offset-2 whitespace-nowrap flex-shrink-0">{toast.action.label} →</span>
        </Link>
        <button type="button" onClick={onClose} aria-label="Cerrar notificación" className="text-current/70 hover:text-current text-lg leading-none flex-shrink-0">×</button>
      </div>
    )
  }

  return (
    <div
      role="status"
      className={className}
    >
      {toast.icon && <span className="text-base">{toast.icon}</span>}
      <span className="flex-1 min-w-0 truncate">{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar notificación" className="text-current/70 hover:text-current text-lg leading-none flex-shrink-0">×</button>
    </div>
  )
}

function playAddSound() {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(660, start)
    oscillator.frequency.setValueAtTime(880, start + 0.09)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.055, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.23)
    oscillator.onended = () => { void context.close() }
  } catch { /* El sonido es opcional y no debe interrumpir la compra. */ }
}

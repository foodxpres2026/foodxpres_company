'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  icon?: string
}

interface ToastContextType {
  toast: (message: string, options?: { type?: 'success' | 'error' | 'info'; icon?: string }) => void
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
    (message: string, options?: { type?: 'success' | 'error' | 'info'; icon?: string }) => {
      const nextToast = {
        id: Math.random().toString(36).substring(2, 9),
        message,
        type: options?.type || 'success',
        icon: options?.icon,
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
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  const colores: Record<string, string> = {
    success: 'bg-brand text-black',
    error: 'bg-danger text-white',
    info: 'bg-surface border border-brand text-white',
  }

  return (
    <div
      role="status"
      className={`${
        colores[toast.type || 'success']
      } rounded-xl px-4 py-3 shadow-2xl font-bold text-sm flex items-center gap-3 pointer-events-auto animate-[slideUp_0.3s_ease-out] max-w-sm`}
    >
      {toast.icon && <span className="text-base">{toast.icon}</span>}
      <span className="flex-1">{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar notificación" className="text-current/70 hover:text-current text-lg leading-none">×</button>
    </div>
  )
}

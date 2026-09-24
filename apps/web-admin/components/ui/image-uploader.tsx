'use client'

import { useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (url: string) => void
  carpeta?: string
  label?: string
  aspect?: 'square' | 'banner'
}

export default function ImageUploader({
  value,
  onChange,
  carpeta = 'general',
  label = 'Imagen',
  aspect = 'banner',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setSubiendo(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('carpeta', carpeta)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Error al subir')
        return
      }

      onChange(data.data.url)
    } catch {
      setError('Error de conexión')
    } finally {
      setSubiendo(false)
    }
  }

  const alturaClase = aspect === 'square' ? 'h-32 w-32' : 'h-40 w-full'

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
        {label}
      </label>

      {value ? (
        <div className="relative group">
          <div className={`${alturaClase} rounded-xl overflow-hidden bg-surface-dark border border-line-light`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-brand hover:bg-brand-dark text-black font-bold text-xs px-3 py-2 rounded-lg"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-danger hover:bg-danger-dark text-white font-bold text-xs px-3 py-2 rounded-lg"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) handleFile(f)
          }}
          onDragOver={(e) => e.preventDefault()}
          className={`${alturaClase} rounded-xl border-2 border-dashed border-line-light hover:border-brand/50 bg-surface-dark cursor-pointer transition-colors flex flex-col items-center justify-center gap-2`}
        >
          {subiendo ? (
            <>
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500">Subiendo...</p>
            </>
          ) : (
            <>
              <span className="text-3xl opacity-40">📷</span>
              <p className="text-xs text-gray-500 text-center px-4">
                Arrastra una imagen o <br /> haz clic para seleccionar
              </p>
              <p className="text-[10px] text-gray-600">JPG, PNG, WEBP, GIF · Máx 5 MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
        className="hidden"
      />

      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  )
}
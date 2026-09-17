'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Categoria {
  id: string
  slug: string
  nombre: string
  emoji: string | null
}

export default function CategoriasChips({
  categorias,
}: {
  categorias: Categoria[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activa = searchParams.get('categoria')

  function seleccionar(slug: string | null) {
    if (!slug) {
      router.push('/')
    } else {
      router.push(`/?categoria=${slug}`)
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      {/* Chip "Todos" */}
      <button
        type="button"
        onClick={() => seleccionar(null)}
        className={`flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0 transition-opacity ${
          !activa ? 'opacity-100' : 'opacity-60 hover:opacity-100'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-colors border-2 ${
            !activa
              ? 'bg-brand/15 border-brand'
              : 'bg-surface border-line'
          }`}
        >
          🍽️
        </div>
        <span
          className={`text-xs font-medium ${
            !activa ? 'text-brand' : 'text-gray-400'
          }`}
        >
          Todos
        </span>
      </button>

      {categorias.map((cat) => {
        const isActive = activa === cat.slug
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => seleccionar(cat.slug)}
            className={`flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-colors border-2 ${
                isActive
                  ? 'bg-brand/15 border-brand'
                  : 'bg-surface border-line'
              }`}
            >
              {cat.emoji || '🍽️'}
            </div>
            <span
              className={`text-xs font-medium truncate max-w-[72px] ${
                isActive ? 'text-brand' : 'text-gray-400'
              }`}
            >
              {cat.nombre}
            </span>
          </button>
        )
      })}
    </div>
  )
}
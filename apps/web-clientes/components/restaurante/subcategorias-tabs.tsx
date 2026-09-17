'use client'

import { useEffect, useState } from 'react'

interface Subcategoria {
  id: string
  nombre: string
  orden: number
}

export default function SubcategoriasTabs({
  subcategorias,
}: {
  subcategorias: Subcategoria[]
}) {
  const [activa, setActiva] = useState<string>(subcategorias[0]?.id || '')

  // Scroll a la sección al click
  function irA(id: string) {
    setActiva(id)
    const el = document.getElementById(`subcat-${id}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 130
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  // Detectar subcategoría activa al hacer scroll
  useEffect(() => {
    function onScroll() {
      const secciones = subcategorias
        .map((s) => ({
          id: s.id,
          el: document.getElementById(`subcat-${s.id}`),
        }))
        .filter((s) => s.el)

      if (secciones.length === 0) return

      const scrollY = window.scrollY + 150

      for (let i = secciones.length - 1; i >= 0; i--) {
        const el = secciones[i].el!
        if (el.offsetTop <= scrollY) {
          setActiva(secciones[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [subcategorias])

  if (subcategorias.length === 0) return null

  return (
    <div className="sticky top-[57px] z-30 bg-surface-dark/95 backdrop-blur-lg border-b border-line -mx-4 px-4 py-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {subcategorias.map((sub) => {
          const isActive = activa === sub.id
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => irA(sub.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-brand text-black'
                  : 'bg-surface text-gray-400 border border-line hover:border-brand/40'
              }`}
            >
              {sub.nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}
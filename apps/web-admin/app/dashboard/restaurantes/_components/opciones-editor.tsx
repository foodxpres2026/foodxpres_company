'use client'

export interface ChoiceLocal {
  nombre: string
  precio_extra: number
}

export interface GrupoLocal {
  titulo: string
  requerido: boolean
  minimo: number
  maximo: number
  choices: ChoiceLocal[]
}

export default function OpcionesEditor({
  grupos,
  onChange,
}: {
  grupos: GrupoLocal[]
  onChange: (grupos: GrupoLocal[]) => void
}) {
  function agregarGrupo() {
    onChange([
      ...grupos,
      {
        titulo: '',
        requerido: true,
        minimo: 1,
        maximo: 1,
        choices: [{ nombre: '', precio_extra: 0 }],
      },
    ])
  }

  function eliminarGrupo(index: number) {
    if (!confirm('¿Eliminar este grupo de opciones?')) return
    onChange(grupos.filter((_, i) => i !== index))
  }

  function updateGrupo<K extends keyof GrupoLocal>(
    index: number,
    key: K,
    value: GrupoLocal[K]
  ) {
    onChange(
      grupos.map((g, i) => (i === index ? { ...g, [key]: value } : g))
    )
  }

  function agregarChoice(grupoIndex: number) {
    onChange(
      grupos.map((g, i) =>
        i === grupoIndex
          ? { ...g, choices: [...g.choices, { nombre: '', precio_extra: 0 }] }
          : g
      )
    )
  }

  function eliminarChoice(grupoIndex: number, choiceIndex: number) {
    onChange(
      grupos.map((g, i) =>
        i === grupoIndex
          ? { ...g, choices: g.choices.filter((_, j) => j !== choiceIndex) }
          : g
      )
    )
  }

  function updateChoice<K extends keyof ChoiceLocal>(
    grupoIndex: number,
    choiceIndex: number,
    key: K,
    value: ChoiceLocal[K]
  ) {
    onChange(
      grupos.map((g, i) =>
        i === grupoIndex
          ? {
              ...g,
              choices: g.choices.map((c, j) =>
                j === choiceIndex ? { ...c, [key]: value } : c
              ),
            }
          : g
      )
    )
  }

  return (
    <div className="bg-surface-dark border border-line-light rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-white">Opciones</h4>
          <p className="text-xs text-gray-500">
            Sabores, entradas, extras... Opcional
          </p>
        </div>
        <button
          type="button"
          onClick={agregarGrupo}
          className="text-xs bg-brand/10 hover:bg-brand/20 text-brand font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          + Grupo
        </button>
      </div>

      {grupos.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-3">
          Sin opciones. Este plato se agrega directo al carrito.
        </p>
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo, gIndex) => (
            <div
              key={gIndex}
              className="bg-surface border border-line rounded-xl p-3 space-y-3"
            >
              {/* HEADER GRUPO */}
              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={grupo.titulo}
                  onChange={(e) =>
                    updateGrupo(gIndex, 'titulo', e.target.value)
                  }
                  placeholder='Ej: "Elige tu salsa"'
                  className="flex-1 px-3 py-2 bg-surface-dark border border-line-light rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => eliminarGrupo(gIndex)}
                  className="text-danger hover:text-danger/80 text-sm p-2"
                  title="Eliminar grupo"
                >
                  🗑
                </button>
              </div>

              {/* CONFIG */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">
                    Mín
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={grupo.minimo}
                    onChange={(e) =>
                      updateGrupo(gIndex, 'minimo', Number(e.target.value) || 0)
                    }
                    className="w-full px-2 py-1.5 bg-surface-dark border border-line-light rounded-lg text-white text-sm focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">
                    Máx
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={grupo.maximo}
                    onChange={(e) =>
                      updateGrupo(gIndex, 'maximo', Number(e.target.value) || 1)
                    }
                    className="w-full px-2 py-1.5 bg-surface-dark border border-line-light rounded-lg text-white text-sm focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">
                    Requerido
                  </label>
                  <label className="flex items-center justify-center gap-2 py-1.5 bg-surface-dark border border-line-light rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grupo.requerido}
                      onChange={(e) =>
                        updateGrupo(gIndex, 'requerido', e.target.checked)
                      }
                      className="w-4 h-4 accent-brand"
                    />
                    <span className="text-xs text-gray-400">
                      {grupo.requerido ? 'Sí' : 'No'}
                    </span>
                  </label>
                </div>
              </div>

              {/* CHOICES */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase">
                  Opciones ({grupo.choices.length})
                </p>
                {grupo.choices.map((choice, cIndex) => (
                  <div key={cIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={choice.nombre}
                      onChange={(e) =>
                        updateChoice(gIndex, cIndex, 'nombre', e.target.value)
                      }
                      placeholder="BBQ"
                      className="flex-1 px-2 py-1.5 bg-surface-dark border border-line-light rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={choice.precio_extra}
                      onChange={(e) =>
                        updateChoice(
                          gIndex,
                          cIndex,
                          'precio_extra',
                          Number(e.target.value) || 0
                        )
                      }
                      placeholder="+S/"
                      className="w-20 px-2 py-1.5 bg-surface-dark border border-line-light rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarChoice(gIndex, cIndex)}
                      disabled={grupo.choices.length === 1}
                      className="text-gray-500 hover:text-danger text-sm px-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => agregarChoice(gIndex)}
                  className="text-xs text-brand hover:underline"
                >
                  + Agregar opción
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
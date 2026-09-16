'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface Resumen {
  pedidosHoy: number
  pedidosActivos: number
  restaurantes: number
  driversActivos: number
  clientes: number
  ingresosHoy: number
}

interface PuntoDia {
  fecha: string
  total: number
  ingresos: number
}

interface PuntoMes {
  mes: string
  total: number
  ingresos: number
}

interface DriverRanking {
  id: string
  nombre: string
  celular: string
  totalEntregas: number
  entregasHoy: number
  entregasMes: number
  totalEnvios: number
}

interface EstadoCount {
  estado: string
  total: number
}

interface Data {
  resumen: Resumen
  pedidosPorDia: PuntoDia[]
  pedidosPorMes: PuntoMes[]
  rankingDrivers: DriverRanking[]
  porEstado: EstadoCount[]
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400',
  ACEPTADO: 'bg-blue-500/15 text-blue-400',
  PREPARANDO: 'bg-blue-500/15 text-blue-400',
  LISTO: 'bg-cyan-500/15 text-cyan-400',
  ASIGNADO: 'bg-orange-500/15 text-orange-400',
  EN_CAMINO: 'bg-orange-500/15 text-orange-400',
  ENTREGADO: 'bg-brand/15 text-brand',
  RECHAZADO: 'bg-red-500/15 text-red-400',
  CANCELADO: 'bg-gray-500/15 text-gray-400',
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  PREPARANDO: 'Aceptado',
  LISTO: 'Listo',
  ASIGNADO: 'En camino',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
}

export default function DashboardClient() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setData(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        Cargando dashboard...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-danger text-sm">
        Error al cargar las estadísticas
      </div>
    )
  }

  const { resumen, pedidosPorDia, pedidosPorMes, rankingDrivers, porEstado } =
    data

  // Formatear datos para gráficos
  const chartDias = pedidosPorDia.map((d) => ({
    ...d,
    label: new Date(d.fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
    }),
  }))

  const chartMeses = pedidosPorMes.map((m) => ({
    ...m,
    label: new Date(m.mes + '-01').toLocaleDateString('es-PE', {
      month: 'short',
    }),
  }))

  const totalEstado = porEstado.reduce((s, e) => s + e.total, 0)

  return (
    <div className="p-5 md:p-8 bg-surface-dark min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Hola, Admin 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Resumen de FoodXpres en tiempo real
        </p>
      </div>

      {/* STATS PRINCIPALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
        <StatCard
          label="Pedidos hoy"
          value={String(resumen.pedidosHoy)}
          icon="📦"
          accent
        />
        <StatCard
          label="Activos ahora"
          value={String(resumen.pedidosActivos)}
          icon="🔥"
        />
        <StatCard
          label="Restaurantes"
          value={String(resumen.restaurantes)}
          icon="🏪"
        />
        <StatCard
          label="Drivers activos"
          value={String(resumen.driversActivos)}
          icon="🏍️"
        />
      </div>

      {/* CLIENTES */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Clientes registrados
              </p>
              <p className="text-3xl md:text-4xl font-bold text-white mt-1">
                {resumen.clientes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO: PEDIDOS POR DÍA */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 mb-4">
        <h2 className="text-sm font-bold text-white mb-4">
          📊 Pedidos por día (últimos 7 días)
        </h2>
        {chartDias.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            Sin datos aún
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDias}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="label"
                  stroke="#666"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#666" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151515',
                    border: '1px solid #222',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#7ED321', fontWeight: 'bold' }}
                  formatter={(value: any, name: any) => [
                    name === 'total' ? `${value} pedidos` : `S/ ${Number(value).toFixed(2)}`,
                    name === 'total' ? 'Pedidos' : 'Ingresos',
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="#7ED321"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* GRÁFICO: PEDIDOS POR MES */}
      <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 mb-4">
        <h2 className="text-sm font-bold text-white mb-4">
          📈 Pedidos por mes (últimos 6 meses)
        </h2>
        {chartMeses.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            Sin datos aún
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartMeses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="label"
                  stroke="#666"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#666" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151515',
                    border: '1px solid #222',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#7ED321', fontWeight: 'bold' }}
                  formatter={(value: any, name: any) => [
                    name === 'total' ? `${value} pedidos` : `S/ ${Number(value).toFixed(2)}`,
                    name === 'total' ? 'Pedidos' : 'Ingresos',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#7ED321"
                  strokeWidth={3}
                  dot={{ fill: '#7ED321', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ESTADO ACTUAL DE PEDIDOS */}
      {totalEstado > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-sm font-bold text-white mb-4">
            🎯 Estado de pedidos (últimos 30 días)
          </h2>
          <div className="space-y-2">
            {porEstado
              .sort((a, b) => b.total - a.total)
              .map((e) => {
                const pct = (e.total / totalEstado) * 100
                return (
                  <div key={e.estado}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">
                        {ESTADO_LABELS[e.estado] || e.estado}
                      </span>
                      <span className="text-white font-bold">
                        {e.total} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          e.estado === 'ENTREGADO'
                            ? 'bg-brand'
                            : e.estado === 'CANCELADO' || e.estado === 'RECHAZADO'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* RANKING DE DRIVERS */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="text-sm font-bold text-white">
            🏆 Ranking de drivers
          </h2>
          <Link
            href="/dashboard/drivers"
            className="text-xs text-brand hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {rankingDrivers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-3xl mb-2">🏍️</p>
            <p className="text-sm text-gray-500">Sin drivers registrados</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rankingDrivers.map((d, i) => (
              <li
                key={d.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-light transition-colors"
              >
                {/* POSICIÓN */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1
                      ? 'bg-gray-400/20 text-gray-300'
                      : i === 2
                      ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-surface-light text-gray-500'
                  }`}
                >
                  {i + 1}
                </div>

                {/* AVATAR */}
                <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                  {d.nombre.charAt(0).toUpperCase()}
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {d.nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.entregasHoy} hoy · {d.entregasMes} este mes
                  </p>
                </div>

                {/* TOTAL */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-brand">
                    {d.totalEntregas}
                  </p>
                  <p className="text-[10px] text-gray-500">entregas</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: string
  accent?: boolean
}) {
  return (
    <div
      className={`bg-surface border rounded-2xl p-4 md:p-5 ${
        accent ? 'border-brand/30' : 'border-line'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <p
        className={`text-2xl md:text-3xl font-bold ${
          accent ? 'text-brand' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
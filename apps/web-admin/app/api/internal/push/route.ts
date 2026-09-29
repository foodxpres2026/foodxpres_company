import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { enviarNotificacion, enviarNotificacionAUsuarios } from '@/lib/firebase/enviar'
import {
  notificarPedidoAceptado,
  notificarPedidoRechazado,
  notificarPedidoListo,
  notificarPedidoEnCamino,
  notificarDriverAsignado,
} from '@/lib/firebase/notificaciones-pedido'

const schema = z.object({
  event: z.enum(['NEW_ORDER', 'AUTOPEDIDO', 'LOCAL_ACCEPTED', 'LOCAL_REJECTED', 'LOCAL_READY', 'DRIVER_TAKEN', 'DRIVER_ON_THE_WAY', 'DRIVER_ARRIVED']),
  subOrderId: z.string().uuid(),
  detail: z.string().trim().max(200).optional(),
})

function isTrusted(request: Request) {
  const expected = process.env.INTERNAL_PUSH_SECRET
  const received = request.headers.get('x-foodxpres-internal-secret')
  if (!expected || Buffer.byteLength(expected) < 32 || !received) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!isTrusted(request)) return Response.json({ ok: false }, { status: 404 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ ok: false, error: 'Evento inválido' }, { status: 400 })

  try {
    const { event, subOrderId, detail } = parsed.data
    const rows = await sql`
      SELECT sp.id, sp.pedido_id, sp.restaurante_id, sp.tiempo_estimado,
        p.usuario_id AS cliente_id, p.codigo AS pedido_codigo,
        r.nombre AS restaurante_nombre, d.nombre AS driver_nombre, sp.driver_id
      FROM sub_pedidos sp
      JOIN pedidos p ON p.id = sp.pedido_id
      JOIN restaurantes r ON r.id = sp.restaurante_id
      LEFT JOIN usuarios d ON d.id = sp.driver_id
      WHERE sp.id = ${subOrderId}::uuid LIMIT 1
    ` as any[]
    const order = rows[0]
    if (!order) return Response.json({ ok: false, error: 'Pedido no encontrado' }, { status: 404 })

    if (event === 'NEW_ORDER' || event === 'AUTOPEDIDO') {
      const [staff, drivers] = await Promise.all([
        event === 'NEW_ORDER'
          ? sql`SELECT id FROM usuarios WHERE role = 'STAFF' AND activo = TRUE AND restaurante_id = ${order.restaurante_id}`
          : Promise.resolve([]),
        sql`SELECT u.id FROM usuarios u JOIN driver_detalles d ON d.usuario_id = u.id
          WHERE u.role = 'DRIVER' AND u.activo = TRUE AND d.disponible = TRUE`,
      ])
      const sendStaff = staff.length ? enviarNotificacionAUsuarios(staff.map((row) => row.id), {
        titulo: '📦 Nuevo pedido', mensaje: `Tienes un pedido nuevo ${order.pedido_codigo} por revisar.`,
        url: '/', tag: `local-pedido-${order.id}`,
      }) : Promise.resolve({ enviados: 0, fallidos: 0 })
      const sendDrivers = drivers.length ? enviarNotificacionAUsuarios(drivers.map((row) => row.id), {
        titulo: '🛵 Nuevo pedido disponible', mensaje: `${order.restaurante_nombre} · Pedido ${order.pedido_codigo}`,
        url: '/', tag: `driver-pedido-${order.id}`,
      }) : Promise.resolve({ enviados: 0, fallidos: 0 })
      const result = await Promise.all([sendStaff, sendDrivers])
      return Response.json({ ok: true, enviados: result.reduce((sum, item) => sum + item.enviados, 0) })
    }

    if (event === 'LOCAL_ACCEPTED') await notificarPedidoAceptado(order.cliente_id, order.restaurante_nombre, order.tiempo_estimado)
    if (event === 'LOCAL_REJECTED') await notificarPedidoRechazado(order.cliente_id, order.restaurante_nombre, detail)
    if (event === 'LOCAL_READY') await notificarPedidoListo(order.cliente_id, order.restaurante_nombre)
    if (event === 'DRIVER_TAKEN') {
      const staff = await sql`SELECT id FROM usuarios WHERE role = 'STAFF' AND activo = TRUE AND restaurante_id = ${order.restaurante_id}` as any[]
      await Promise.all([
        enviarNotificacionAUsuarios(staff.map((row) => row.id), {
          titulo: '🏍️ Repartidor asignado', mensaje: `${order.driver_nombre || 'Un driver'} tomó el pedido ${order.pedido_codigo}.`,
          url: '/', tag: `local-driver-${order.id}`,
        }),
        order.driver_id ? notificarDriverAsignado(order.cliente_id, order.driver_nombre || 'Tu repartidor', order.restaurante_nombre) : Promise.resolve(null),
      ])
    }
    if (event === 'DRIVER_ON_THE_WAY') await notificarPedidoEnCamino(order.cliente_id, order.restaurante_nombre, order.driver_nombre)
    if (event === 'DRIVER_ARRIVED') await enviarNotificacion({
      usuarioId: order.cliente_id,
      titulo: '📍 El repartidor llegó',
      mensaje: `El driver ya llegó con tu pedido de ${order.restaurante_nombre}. Confirma la recepción cuando lo recibas.`,
      url: '/mis-pedidos', tag: `pedido-llego-${order.id}`,
    })
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Internal push event error:', error)
    return Response.json({ ok: false, error: 'No se pudo procesar la notificación' }, { status: 500 })
  }
}

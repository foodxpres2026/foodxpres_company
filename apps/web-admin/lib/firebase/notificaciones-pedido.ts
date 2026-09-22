import { enviarNotificacion } from './enviar'

// ============================================================
// NOTIFICACIONES SEGÚN ESTADO DEL SUB-PEDIDO
// ============================================================
export async function notificarPedidoAceptado(
  usuarioId: string,
  restauranteNombre: string,
  tiempoMin: number | null
) {
  const tiempo = tiempoMin ? ` (${tiempoMin} min aprox)` : ''
  return enviarNotificacion({
    usuarioId,
    titulo: '✅ Pedido aceptado',
    mensaje: `${restauranteNombre} aceptó tu pedido${tiempo}`,
    url: '/mis-pedidos',
    tag: 'pedido-aceptado',
  })
}

export async function notificarPedidoRechazado(
  usuarioId: string,
  restauranteNombre: string,
  motivo?: string | null
) {
  return enviarNotificacion({
    usuarioId,
    titulo: '❌ Pedido rechazado',
    mensaje: `${restauranteNombre} no pudo aceptar tu pedido${
      motivo ? `: ${motivo}` : ''
    }`,
    url: '/mis-pedidos',
    tag: 'pedido-rechazado',
  })
}

export async function notificarPedidoListo(
  usuarioId: string,
  restauranteNombre: string
) {
  return enviarNotificacion({
    usuarioId,
    titulo: '🍽️ ¡Tu pedido está listo!',
    mensaje: `${restauranteNombre} terminó de preparar tu pedido`,
    url: '/mis-pedidos',
    tag: 'pedido-listo',
  })
}

export async function notificarPedidoEnCamino(
  usuarioId: string,
  restauranteNombre: string,
  driverNombre: string | null
) {
  return enviarNotificacion({
    usuarioId,
    titulo: '🛵 Tu pedido va en camino',
    mensaje: driverNombre
      ? `${driverNombre} está llevando tu pedido de ${restauranteNombre}`
      : `Tu pedido de ${restauranteNombre} salió a delivery`,
    url: '/mis-pedidos',
    tag: 'pedido-en-camino',
  })
}

export async function notificarPedidoEntregado(
  usuarioId: string,
  restauranteNombre: string
) {
  return enviarNotificacion({
    usuarioId,
    titulo: '🎉 ¡Pedido entregado!',
    mensaje: `Tu pedido de ${restauranteNombre} llegó. ¡Buen provecho!`,
    url: '/mis-pedidos',
    tag: 'pedido-entregado',
  })
}

export async function notificarPedidoCancelado(
  usuarioId: string,
  restauranteNombre: string
) {
  return enviarNotificacion({
    usuarioId,
    titulo: '🚫 Pedido cancelado',
    mensaje: `Tu pedido de ${restauranteNombre} fue cancelado`,
    url: '/mis-pedidos',
    tag: 'pedido-cancelado',
  })
}

export async function notificarDriverAsignado(
  usuarioId: string,
  driverNombre: string,
  restauranteNombre: string
) {
  return enviarNotificacion({
    usuarioId,
    titulo: '🏍️ Repartidor asignado',
    mensaje: `${driverNombre} irá a recoger tu pedido de ${restauranteNombre}`,
    url: '/mis-pedidos',
    tag: 'driver-asignado',
  })
}
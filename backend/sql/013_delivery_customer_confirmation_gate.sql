-- El driver reporta que entregó, pero el pedido solo se cierra cuando
-- confirma el cliente o administración lo libera manualmente.
BEGIN;

CREATE OR REPLACE FUNCTION confirmar_entrega_subpedido(
  p_sub_pedido UUID, p_actor UUID, p_modo VARCHAR DEFAULT 'CLIENTE', p_nota TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_sub sub_pedidos%ROWTYPE;
  v_pedido_usuario UUID;
BEGIN
  SELECT * INTO v_sub FROM sub_pedidos WHERE id = p_sub_pedido FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

  SELECT usuario_id INTO v_pedido_usuario FROM pedidos WHERE id = v_sub.pedido_id;
  IF p_modo IS NULL OR p_modo NOT IN ('CLIENTE', 'ADMIN', 'LOCAL', 'DRIVER') THEN
    RAISE EXCEPTION 'Modo de confirmación inválido';
  END IF;

  IF p_modo IN ('CLIENTE', 'LOCAL') AND v_pedido_usuario IS DISTINCT FROM p_actor THEN
    RAISE EXCEPTION 'Pedido no pertenece al cliente';
  END IF;
  IF p_modo = 'LOCAL' AND NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id = p_actor AND role = 'STAFF' AND restaurante_id = v_sub.restaurante_id
  ) THEN RAISE EXCEPTION 'Local no autorizado para confirmar'; END IF;
  IF p_modo = 'LOCAL' AND v_sub.direccion_snapshot->>'etiqueta' IS DISTINCT FROM 'Autopedido' THEN
    RAISE EXCEPTION 'El local solo puede confirmar autopedidos propios';
  END IF;
  IF p_modo = 'DRIVER' AND (
    v_sub.driver_id IS DISTINCT FROM p_actor OR
    NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_actor AND role = 'DRIVER')
  ) THEN RAISE EXCEPTION 'Driver no autorizado para reportar esta entrega'; END IF;

  -- Compatibilidad: el acuse de pedidos ya cerrados no vuelve a abrir ni cerrar nada.
  IF p_modo = 'CLIENTE' AND v_sub.estado = 'ENTREGADO' THEN
    IF v_sub.cliente_confirmo_en IS NULL THEN
      UPDATE sub_pedidos SET cliente_confirmo_en = NOW() WHERE id = p_sub_pedido;
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (p_sub_pedido, 'ENTREGADO', p_actor, 'Cliente confirmó recepción después del cierre');
    END IF;
    RETURN v_sub.pedido_id;
  END IF;

  IF p_modo = 'LOCAL' AND v_sub.estado = 'ENTREGADO' THEN
    IF v_sub.entrega_cerrada_local_en IS NULL THEN
      UPDATE sub_pedidos SET entrega_cerrada_local_en = NOW() WHERE id = p_sub_pedido;
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (p_sub_pedido, 'ENTREGADO', p_actor, 'Local confirmó recepción del autopedido');
    END IF;
    RETURN v_sub.pedido_id;
  END IF;
  IF p_modo = 'LOCAL' AND v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
    RAISE EXCEPTION 'El local solo puede confirmar la recepción después del reporte de entrega';
  END IF;

  -- El reporte del driver es un estado intermedio. No genera comisiones ni libera
  -- el pedido; los reintentos de la app no alteran el resultado.
  IF p_modo = 'DRIVER' AND v_sub.estado = 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
    IF v_sub.entrega_reportada_en IS NULL THEN RAISE EXCEPTION 'Falta registrar la entrega del pedido'; END IF;
    RETURN v_sub.pedido_id;
  END IF;

  IF p_modo = 'DRIVER' THEN
    IF v_sub.estado <> 'EN_CAMINO' THEN
      RAISE EXCEPTION 'El pedido no está en camino';
    END IF;
    IF v_sub.recogido_en IS NULL OR NOT EXISTS (
      SELECT 1 FROM pedido_estado_historial h
      WHERE h.sub_pedido_id = p_sub_pedido AND h.cambiado_por = p_actor AND h.notas = 'LLEGUE_CLIENTE'
    ) THEN RAISE EXCEPTION 'Registra primero la llegada al cliente'; END IF;

    UPDATE sub_pedidos
    SET estado = 'ENTREGA_PENDIENTE_CONFIRMACION', entrega_reportada_en = COALESCE(entrega_reportada_en, NOW())
    WHERE id = p_sub_pedido;

    INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
    VALUES (p_sub_pedido, 'ENTREGA_PENDIENTE_CONFIRMACION', p_actor, 'Driver reportó la entrega; pendiente de confirmación del cliente');

    UPDATE pedidos p SET estado_global = CASE
      WHEN NOT EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado <> 'ENTREGADO') THEN 'ENTREGADO'
      WHEN NOT EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado <> 'CANCELADO') THEN 'CANCELADO'
      WHEN NOT EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado <> 'RECHAZADO') THEN 'RECHAZADO'
      WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('RECHAZADO', 'CANCELADO')) THEN 'PARCIAL'
      WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('EN_CAMINO', 'ENTREGA_PENDIENTE_CONFIRMACION')) THEN 'EN_CAMINO'
      WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado = 'LISTO') THEN 'LISTO'
      WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('ACEPTADO', 'PREPARANDO')) THEN 'ACEPTADO'
      ELSE 'PENDIENTE' END,
      actualizado_en = NOW()
    WHERE p.id = v_sub.pedido_id;

    RETURN v_sub.pedido_id;
  END IF;

  IF p_modo = 'CLIENTE' AND v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
    RAISE EXCEPTION 'El driver todavía no reportó la entrega';
  END IF;
  IF p_modo = 'ADMIN' AND (
    v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' OR v_sub.entrega_reportada_en IS NULL
  ) THEN RAISE EXCEPTION 'Solo se puede liberar un pedido cuya entrega ya reportó el driver'; END IF;
  IF p_modo IN ('ADMIN', 'LOCAL') AND v_sub.estado IN ('ENTREGADO', 'RECHAZADO', 'CANCELADO') THEN
    RAISE EXCEPTION 'El pedido ya está finalizado';
  END IF;

  UPDATE sub_pedidos SET estado = 'ENTREGADO', entregado_en = NOW(),
    cliente_confirmo_en = CASE WHEN p_modo = 'CLIENTE' THEN NOW() ELSE cliente_confirmo_en END,
    entrega_cerrada_admin_en = CASE WHEN p_modo = 'ADMIN' THEN NOW() ELSE entrega_cerrada_admin_en END,
    entrega_cerrada_local_en = CASE WHEN p_modo = 'LOCAL' THEN NOW() ELSE entrega_cerrada_local_en END
  WHERE id = p_sub_pedido;

  INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
  VALUES (p_sub_pedido, 'ENTREGADO', p_actor,
    COALESCE(NULLIF(p_nota, ''), CASE p_modo
      WHEN 'ADMIN' THEN 'Liberado manualmente por administración tras reporte de entrega'
      WHEN 'LOCAL' THEN 'Confirmación de entrega por el local (autopedido)'
      ELSE 'Cliente confirmó recepción y liberó al driver'
    END));

  -- La deuda de comisión se crea solo al cerrar, con la misma protección idempotente.
  PERFORM 1 FROM restaurantes WHERE id = v_sub.restaurante_id FOR UPDATE;
  IF v_sub.driver_id IS NOT NULL THEN
    PERFORM 1 FROM usuarios WHERE id = v_sub.driver_id AND role = 'DRIVER' FOR UPDATE;
  END IF;

  INSERT INTO comisiones_generadas (sub_pedido_id, beneficiario_tipo, beneficiario_id, base, modalidad, valor_regla, monto)
  SELECT p_sub_pedido, 'LOCAL', v_sub.restaurante_id, v_sub.subtotal,
    v_sub.local_comision_modalidad, v_sub.local_comision_valor, v_sub.local_comision_monto
  WHERE v_sub.local_comision_monto > 0
  ON CONFLICT (sub_pedido_id, beneficiario_tipo) DO NOTHING;

  INSERT INTO comisiones_generadas (sub_pedido_id, beneficiario_tipo, beneficiario_id, base, modalidad, valor_regla, monto)
  SELECT p_sub_pedido, 'DRIVER', v_sub.driver_id, v_sub.costo_envio,
    'PORCENTAJE', v_sub.driver_comision_valor, v_sub.driver_comision_monto
  WHERE v_sub.driver_id IS NOT NULL AND v_sub.driver_comision_monto > 0
  ON CONFLICT (sub_pedido_id, beneficiario_tipo) DO NOTHING;

  UPDATE pedidos p SET estado_global = CASE
    WHEN NOT EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado <> 'ENTREGADO') THEN 'ENTREGADO'
    WHEN NOT EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado <> 'CANCELADO') THEN 'CANCELADO'
    WHEN NOT EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado <> 'RECHAZADO') THEN 'RECHAZADO'
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('RECHAZADO', 'CANCELADO')) THEN 'PARCIAL'
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('EN_CAMINO', 'ENTREGA_PENDIENTE_CONFIRMACION')) THEN 'EN_CAMINO'
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado = 'LISTO') THEN 'LISTO'
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('ACEPTADO', 'PREPARANDO')) THEN 'ACEPTADO'
    ELSE 'PENDIENTE' END,
    actualizado_en = NOW()
  WHERE p.id = v_sub.pedido_id;
  RETURN v_sub.pedido_id;
END;
$$;

-- Las entregas pendientes ocupan uno de los dos espacios de pedidos del driver.
CREATE OR REPLACE FUNCTION tomar_pedido_driver(
  p_sub_pedido UUID,
  p_driver UUID,
  p_solo_listos BOOLEAN DEFAULT FALSE
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_disponible BOOLEAN;
  v_activos INTEGER;
  v_estado VARCHAR(20);
  v_deuda_vencida NUMERIC(12,2);
BEGIN
  SELECT disponible INTO v_disponible FROM driver_detalles WHERE usuario_id = p_driver FOR UPDATE;
  IF NOT FOUND OR NOT v_disponible THEN RAISE EXCEPTION 'Driver desconectado'; END IF;

  PERFORM 1 FROM usuarios WHERE id = p_driver AND role = 'DRIVER' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver no encontrado'; END IF;

  SELECT GREATEST(
    COALESCE((SELECT SUM(monto) FROM comisiones_generadas
      WHERE beneficiario_tipo = 'DRIVER' AND beneficiario_id = p_driver
        AND creado_en <= NOW() - INTERVAL '2 days'), 0)
    - COALESCE((SELECT SUM(monto) FROM comision_pagos
      WHERE beneficiario_tipo = 'DRIVER' AND beneficiario_id = p_driver), 0),
    0
  ) INTO v_deuda_vencida;
  IF v_deuda_vencida > 0 THEN
    RAISE EXCEPTION 'Tienes una deuda vencida de S/ %; administración debe registrar el pago para que puedas tomar pedidos',
      to_char(v_deuda_vencida, 'FM999999990.00');
  END IF;

  SELECT COUNT(*) INTO v_activos FROM sub_pedidos
  WHERE driver_id = p_driver
    AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGA_PENDIENTE_CONFIRMACION');
  IF v_activos >= 2 THEN RAISE EXCEPTION 'Ya tienes el máximo de 2 pedidos activos'; END IF;

  UPDATE sub_pedidos SET driver_id = p_driver, driver_asignado_en = NOW(),
    estado = CASE WHEN estado = 'LISTO' THEN 'ASIGNADO' ELSE estado END
  WHERE id = p_sub_pedido AND driver_id IS NULL
    AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO')
    AND (NOT p_solo_listos OR estado = 'LISTO')
  RETURNING estado INTO v_estado;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido ya tomado o no disponible'; END IF;
  RETURN v_estado;
END;
$$;

COMMIT;

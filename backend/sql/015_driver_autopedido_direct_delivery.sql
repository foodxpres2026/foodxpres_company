-- Para autopedidos, el driver puede cerrar la entrega directamente.
-- Los pedidos normales conservan la confirmación del cliente o liberación del admin.
BEGIN;

CREATE OR REPLACE FUNCTION confirmar_entrega_subpedido(
  p_sub_pedido UUID, p_actor UUID, p_modo VARCHAR DEFAULT 'CLIENTE', p_nota TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_sub sub_pedidos%ROWTYPE;
  v_pedido_usuario UUID;
  v_autopedido BOOLEAN;
BEGIN
  SELECT * INTO v_sub FROM sub_pedidos WHERE id = p_sub_pedido FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  SELECT usuario_id INTO v_pedido_usuario FROM pedidos WHERE id = v_sub.pedido_id;
  v_autopedido := COALESCE(v_sub.direccion_snapshot->>'etiqueta' = 'Autopedido', FALSE);
  IF p_modo IS NULL OR p_modo NOT IN ('CLIENTE', 'ADMIN', 'LOCAL', 'DRIVER') THEN
    RAISE EXCEPTION 'Modo de confirmación inválido';
  END IF;
  IF p_modo IN ('CLIENTE', 'LOCAL') AND v_pedido_usuario IS DISTINCT FROM p_actor THEN
    RAISE EXCEPTION 'Pedido no pertenece al cliente';
  END IF;
  IF p_modo = 'LOCAL' AND NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id = p_actor AND role = 'STAFF' AND restaurante_id = v_sub.restaurante_id
  ) THEN RAISE EXCEPTION 'Local no autorizado para confirmar'; END IF;
  IF p_modo = 'LOCAL' AND NOT v_autopedido THEN
    RAISE EXCEPTION 'El local solo puede confirmar autopedidos propios';
  END IF;
  IF p_modo = 'DRIVER' AND (
    v_sub.driver_id IS DISTINCT FROM p_actor OR
    NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_actor AND role = 'DRIVER')
  ) THEN RAISE EXCEPTION 'Driver no autorizado para reportar esta entrega'; END IF;

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
  IF p_modo = 'DRIVER' AND v_sub.estado = 'ENTREGADO' THEN RETURN v_sub.pedido_id; END IF;
  IF p_modo = 'LOCAL' AND v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
    RAISE EXCEPTION 'El local solo puede confirmar la recepción después del reporte de entrega';
  END IF;

  IF p_modo = 'DRIVER' AND v_sub.estado = 'ENTREGA_PENDIENTE_CONFIRMACION'
    AND v_sub.entrega_reportada_en IS NULL THEN
    RAISE EXCEPTION 'Falta registrar la entrega del pedido';
  END IF;
  IF p_modo = 'DRIVER' AND v_sub.estado = 'ENTREGA_PENDIENTE_CONFIRMACION' AND NOT v_autopedido THEN
    RETURN v_sub.pedido_id;
  END IF;
  IF p_modo = 'DRIVER' AND v_sub.estado = 'EN_CLIENTE' THEN
    IF v_sub.recogido_en IS NULL OR NOT EXISTS (
      SELECT 1 FROM pedido_estado_historial h
      WHERE h.sub_pedido_id = p_sub_pedido AND h.cambiado_por = p_actor AND h.notas = 'LLEGUE_CLIENTE'
    ) THEN RAISE EXCEPTION 'Registra primero la llegada al cliente'; END IF;
    IF NOT v_autopedido THEN
      UPDATE sub_pedidos SET estado = 'ENTREGA_PENDIENTE_CONFIRMACION', entrega_reportada_en = COALESCE(entrega_reportada_en, NOW())
        WHERE id = p_sub_pedido;
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
        VALUES (p_sub_pedido, 'ENTREGA_PENDIENTE_CONFIRMACION', p_actor, 'Driver reportó la entrega; pendiente de confirmación del cliente');
      RETURN v_sub.pedido_id;
    END IF;
  ELSIF p_modo = 'DRIVER' AND v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
    RAISE EXCEPTION 'El driver debe registrar primero su llegada al cliente';
  END IF;
  IF p_modo = 'CLIENTE' AND v_sub.estado NOT IN ('EN_CLIENTE', 'ENTREGA_PENDIENTE_CONFIRMACION') THEN
    RAISE EXCEPTION 'El driver todavía no llegó al cliente';
  END IF;
  IF p_modo = 'ADMIN' AND NOT (
    (v_sub.estado = 'ENTREGA_PENDIENTE_CONFIRMACION' AND v_sub.entrega_reportada_en IS NOT NULL)
    OR (v_sub.estado IN ('EN_CLIENTE', 'CANCELADO') AND v_sub.driver_llego_cliente_en IS NOT NULL)
  ) THEN RAISE EXCEPTION 'Solo se puede liberar un pedido cuando el driver ya llegó al cliente'; END IF;
  IF p_modo IN ('ADMIN', 'LOCAL') AND v_sub.estado IN ('ENTREGADO', 'RECHAZADO', 'CANCELADO')
    AND NOT (p_modo = 'ADMIN' AND v_sub.estado = 'CANCELADO' AND v_sub.driver_llego_cliente_en IS NOT NULL) THEN
    RAISE EXCEPTION 'El pedido ya está finalizado';
  END IF;

  UPDATE sub_pedidos SET estado = 'ENTREGADO', entregado_en = NOW(),
    entrega_reportada_en = CASE WHEN p_modo IN ('CLIENTE', 'DRIVER') THEN COALESCE(entrega_reportada_en, NOW()) ELSE entrega_reportada_en END,
    cliente_confirmo_en = CASE WHEN p_modo = 'CLIENTE' THEN NOW() ELSE cliente_confirmo_en END,
    entrega_cerrada_admin_en = CASE WHEN p_modo = 'ADMIN' THEN NOW() ELSE entrega_cerrada_admin_en END,
    entrega_cerrada_local_en = CASE WHEN p_modo = 'LOCAL' THEN NOW() ELSE entrega_cerrada_local_en END
  WHERE id = p_sub_pedido;
  INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
  VALUES (p_sub_pedido, 'ENTREGADO', p_actor,
    COALESCE(NULLIF(p_nota, ''), CASE
      WHEN p_modo = 'ADMIN' THEN 'Administración confirmó la recepción y liberó al driver'
      WHEN p_modo = 'LOCAL' THEN 'Confirmación de entrega por el local (autopedido)'
      WHEN p_modo = 'DRIVER' AND v_autopedido THEN 'Driver confirmó entrega del autopedido'
      ELSE 'Cliente confirmó recepción y liberó al driver'
    END));

  PERFORM 1 FROM restaurantes WHERE id = v_sub.restaurante_id FOR UPDATE;
  IF v_sub.driver_id IS NOT NULL THEN
    PERFORM 1 FROM usuarios WHERE id = v_sub.driver_id AND role = 'DRIVER' FOR UPDATE;
  END IF;
  INSERT INTO comisiones_generadas (sub_pedido_id, beneficiario_tipo, beneficiario_id, base, modalidad, valor_regla, monto)
  SELECT p_sub_pedido, 'LOCAL', v_sub.restaurante_id, v_sub.subtotal,
    v_sub.local_comision_modalidad, v_sub.local_comision_valor, v_sub.local_comision_monto
  WHERE v_sub.local_comision_monto > 0 ON CONFLICT (sub_pedido_id, beneficiario_tipo) DO NOTHING;
  INSERT INTO comisiones_generadas (sub_pedido_id, beneficiario_tipo, beneficiario_id, base, modalidad, valor_regla, monto)
  SELECT p_sub_pedido, 'DRIVER', v_sub.driver_id, v_sub.costo_envio,
    'PORCENTAJE', v_sub.driver_comision_valor, v_sub.driver_comision_monto
  WHERE v_sub.driver_id IS NOT NULL AND v_sub.driver_comision_monto > 0
  ON CONFLICT (sub_pedido_id, beneficiario_tipo) DO NOTHING;
  RETURN v_sub.pedido_id;
END;
$$;

COMMIT;

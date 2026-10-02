-- El driver puede finalizar la entrega. La confirmación posterior del cliente
-- queda como acuse opcional y no vuelve a generar comisiones.
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
  ) THEN RAISE EXCEPTION 'Driver no autorizado para finalizar este pedido'; END IF;

  -- Tras la finalización del driver, el cliente solo registra su acuse opcional.
  IF p_modo = 'CLIENTE' AND v_sub.estado = 'ENTREGADO' THEN
    IF v_sub.cliente_confirmo_en IS NULL THEN
      UPDATE sub_pedidos SET cliente_confirmo_en = NOW() WHERE id = p_sub_pedido;
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (p_sub_pedido, 'ENTREGADO', p_actor, 'Cliente confirmó recepción (acuse opcional)');
    END IF;
    RETURN v_sub.pedido_id;
  END IF;

  -- En autopedidos el local que es cliente también puede confirmar después.
  IF p_modo = 'LOCAL' AND v_sub.estado = 'ENTREGADO' THEN
    IF v_sub.entrega_cerrada_local_en IS NULL THEN
      UPDATE sub_pedidos SET entrega_cerrada_local_en = NOW() WHERE id = p_sub_pedido;
      INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
      VALUES (p_sub_pedido, 'ENTREGADO', p_actor, 'Local confirmó recepción del autopedido');
    END IF;
    RETURN v_sub.pedido_id;
  END IF;

  -- Reintentos de red del driver son idempotentes y no duplican deuda.
  IF p_modo = 'DRIVER' AND v_sub.estado = 'ENTREGADO' THEN
    RETURN v_sub.pedido_id;
  END IF;

  IF p_modo = 'DRIVER' THEN
    IF v_sub.estado = 'EN_CAMINO' THEN
      IF v_sub.recogido_en IS NULL OR NOT EXISTS (
        SELECT 1 FROM pedido_estado_historial h
        WHERE h.sub_pedido_id = p_sub_pedido AND h.cambiado_por = p_actor AND h.notas = 'LLEGUE_CLIENTE'
      ) THEN RAISE EXCEPTION 'Registra primero la llegada al cliente'; END IF;
    ELSIF v_sub.estado = 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
      -- Permite liberar pedidos de la versión anterior que esperaban la respuesta del cliente.
      IF v_sub.entrega_reportada_en IS NULL THEN RAISE EXCEPTION 'Falta registrar la entrega del pedido'; END IF;
    ELSE
      RAISE EXCEPTION 'El pedido no está en una etapa que el driver pueda finalizar';
    END IF;
  ELSIF p_modo = 'CLIENTE' THEN
    IF v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
      RAISE EXCEPTION 'El pedido todavía no espera confirmación del cliente';
    END IF;
  ELSIF p_modo IN ('ADMIN', 'LOCAL') THEN
    IF v_sub.estado IN ('ENTREGADO', 'RECHAZADO', 'CANCELADO') THEN
      RAISE EXCEPTION 'El pedido ya está finalizado';
    END IF;
  END IF;

  UPDATE sub_pedidos SET estado = 'ENTREGADO', entregado_en = NOW(),
    entrega_reportada_en = CASE WHEN p_modo = 'DRIVER' THEN COALESCE(entrega_reportada_en, NOW()) ELSE entrega_reportada_en END,
    cliente_confirmo_en = CASE WHEN p_modo = 'CLIENTE' THEN NOW() ELSE cliente_confirmo_en END,
    entrega_cerrada_admin_en = CASE WHEN p_modo = 'ADMIN' THEN NOW() ELSE entrega_cerrada_admin_en END,
    entrega_cerrada_local_en = CASE WHEN p_modo = 'LOCAL' THEN NOW() ELSE entrega_cerrada_local_en END
  WHERE id = p_sub_pedido;

  INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
  VALUES (p_sub_pedido, 'ENTREGADO', p_actor,
    COALESCE(NULLIF(p_nota, ''), CASE p_modo
      WHEN 'ADMIN' THEN 'Cierre manual por administrador'
      WHEN 'LOCAL' THEN 'Confirmación de entrega por el local (autopedido)'
      WHEN 'DRIVER' THEN 'Entrega finalizada por el driver'
      ELSE 'Entrega confirmada por el cliente'
    END));

  -- Bloquea los beneficiarios y crea deuda exactamente una vez.
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

COMMIT;

-- Bloquea nuevas asignaciones cuando la comisión del driver lleva 48 horas sin pagarse.
-- Los pagos agregados se imputan primero a la deuda más antigua (FIFO).

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
  SELECT disponible INTO v_disponible
  FROM driver_detalles
  WHERE usuario_id = p_driver
  FOR UPDATE;

  IF NOT FOUND OR NOT v_disponible THEN
    RAISE EXCEPTION 'Driver desconectado';
  END IF;

  -- La fila de usuario también la bloquea registrar_pago_comision: así el pago
  -- y la toma de pedido no discrepan si ocurren simultáneamente.
  PERFORM 1 FROM usuarios WHERE id = p_driver AND role = 'DRIVER' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver no encontrado';
  END IF;

  SELECT GREATEST(
    COALESCE((
      SELECT SUM(monto) FROM comisiones_generadas
      WHERE beneficiario_tipo = 'DRIVER'
        AND beneficiario_id = p_driver
        AND creado_en <= NOW() - INTERVAL '2 days'
    ), 0)
    - COALESCE((
      SELECT SUM(monto) FROM comision_pagos
      WHERE beneficiario_tipo = 'DRIVER' AND beneficiario_id = p_driver
    ), 0),
    0
  ) INTO v_deuda_vencida;

  IF v_deuda_vencida > 0 THEN
    RAISE EXCEPTION 'Tienes una deuda vencida de S/ %; administración debe registrar el pago para que puedas tomar pedidos',
      to_char(v_deuda_vencida, 'FM999999990.00');
  END IF;

  SELECT COUNT(*) INTO v_activos
  FROM sub_pedidos
  WHERE driver_id = p_driver
    AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO');

  IF v_activos >= 2 THEN
    RAISE EXCEPTION 'Ya tienes el máximo de 2 pedidos activos';
  END IF;

  UPDATE sub_pedidos
  SET driver_id = p_driver,
      driver_asignado_en = NOW(),
      estado = CASE WHEN estado = 'LISTO' THEN 'ASIGNADO' ELSE estado END
  WHERE id = p_sub_pedido
    AND driver_id IS NULL
    AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO')
    AND (NOT p_solo_listos OR estado = 'LISTO')
  RETURNING estado INTO v_estado;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido ya tomado o no disponible';
  END IF;

  RETURN v_estado;
END;
$$;

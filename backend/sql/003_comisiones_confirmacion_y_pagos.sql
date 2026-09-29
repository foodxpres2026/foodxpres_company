-- Comisiones configurables con copia por subpedido y registro de pagos.
-- Los pedidos anteriores a esta migración conservan snapshots NULL y no generan deuda retroactiva.

CREATE TABLE IF NOT EXISTS comision_reglas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_tipo VARCHAR(10) NOT NULL CHECK (beneficiario_tipo IN ('LOCAL', 'DRIVER')),
  restaurante_id UUID REFERENCES restaurantes(id),
  modalidad VARCHAR(12) NOT NULL CHECK (modalidad IN ('FIJA', 'PORCENTAJE')),
  valor NUMERIC(10,4) NOT NULL CHECK (valor >= 0),
  creado_por UUID REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((beneficiario_tipo = 'LOCAL' AND restaurante_id IS NOT NULL) OR
         (beneficiario_tipo = 'DRIVER' AND restaurante_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_comision_reglas_local_fecha
  ON comision_reglas (restaurante_id, creado_en DESC) WHERE beneficiario_tipo = 'LOCAL';
CREATE INDEX IF NOT EXISTS idx_comision_reglas_driver_fecha
  ON comision_reglas (creado_en DESC) WHERE beneficiario_tipo = 'DRIVER';

ALTER TABLE sub_pedidos
  ADD COLUMN IF NOT EXISTS local_comision_regla_id UUID REFERENCES comision_reglas(id),
  ADD COLUMN IF NOT EXISTS local_comision_modalidad VARCHAR(12),
  ADD COLUMN IF NOT EXISTS local_comision_valor NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS local_comision_monto NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS driver_comision_regla_id UUID REFERENCES comision_reglas(id),
  ADD COLUMN IF NOT EXISTS driver_comision_valor NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS driver_comision_monto NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS entrega_reportada_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cliente_confirmo_en TIMESTAMPTZ;
ALTER TABLE sub_pedidos
  ADD COLUMN IF NOT EXISTS driver_asignado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_llego_en TIMESTAMPTZ;
ALTER TABLE sub_pedidos ADD COLUMN IF NOT EXISTS entrega_cerrada_admin_en TIMESTAMPTZ;
ALTER TABLE sub_pedidos ADD COLUMN IF NOT EXISTS entrega_cerrada_local_en TIMESTAMPTZ;

ALTER TABLE sub_pedidos DROP CONSTRAINT IF EXISTS sub_pedidos_estado_check;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_estado_check CHECK (estado IN (
  'PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO',
  'ENTREGA_PENDIENTE_CONFIRMACION', 'ENTREGADO', 'RECHAZADO', 'CANCELADO'
));
CREATE INDEX IF NOT EXISTS idx_subpedidos_confirmacion_cliente
  ON sub_pedidos (pedido_id, estado) WHERE estado = 'ENTREGA_PENDIENTE_CONFIRMACION';

CREATE TABLE IF NOT EXISTS comisiones_generadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_pedido_id UUID NOT NULL REFERENCES sub_pedidos(id),
  beneficiario_tipo VARCHAR(10) NOT NULL CHECK (beneficiario_tipo IN ('LOCAL', 'DRIVER')),
  beneficiario_id UUID NOT NULL,
  base NUMERIC(10,2) NOT NULL CHECK (base >= 0),
  modalidad VARCHAR(12) NOT NULL CHECK (modalidad IN ('FIJA', 'PORCENTAJE')),
  valor_regla NUMERIC(10,4) NOT NULL,
  monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sub_pedido_id, beneficiario_tipo)
);
CREATE INDEX IF NOT EXISTS idx_comisiones_beneficiario
  ON comisiones_generadas (beneficiario_tipo, beneficiario_id, creado_en DESC);

CREATE OR REPLACE FUNCTION tomar_pedido_driver(p_sub_pedido UUID, p_driver UUID, p_solo_listos BOOLEAN DEFAULT FALSE)
RETURNS VARCHAR LANGUAGE plpgsql AS $$
DECLARE
  v_disponible BOOLEAN;
  v_activos INTEGER;
  v_estado VARCHAR(20);
BEGIN
  SELECT disponible INTO v_disponible FROM driver_detalles WHERE usuario_id = p_driver FOR UPDATE;
  IF NOT FOUND OR NOT v_disponible THEN RAISE EXCEPTION 'Driver desconectado'; END IF;

  SELECT COUNT(*) INTO v_activos FROM sub_pedidos
  WHERE driver_id = p_driver AND estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARANDO', 'LISTO', 'ASIGNADO', 'EN_CAMINO');
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

CREATE TABLE IF NOT EXISTS comision_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_tipo VARCHAR(10) NOT NULL CHECK (beneficiario_tipo IN ('LOCAL', 'DRIVER')),
  beneficiario_id UUID NOT NULL,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  nota TEXT,
  pagado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comision_pagos_beneficiario
  ON comision_pagos (beneficiario_tipo, beneficiario_id, pagado_en DESC);

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
  IF p_modo IS NULL OR p_modo NOT IN ('CLIENTE', 'ADMIN', 'LOCAL') THEN
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
  IF p_modo IN ('ADMIN', 'LOCAL') THEN
    IF v_sub.estado IN ('ENTREGADO', 'RECHAZADO', 'CANCELADO') THEN
      RAISE EXCEPTION 'El pedido ya está finalizado';
    END IF;
  ELSIF v_sub.estado <> 'ENTREGA_PENDIENTE_CONFIRMACION' THEN
    RAISE EXCEPTION 'El pedido todavía no espera confirmación del cliente';
  END IF;

  UPDATE sub_pedidos SET estado = 'ENTREGADO', entregado_en = NOW(),
    cliente_confirmo_en = CASE WHEN p_modo = 'CLIENTE' THEN NOW() ELSE cliente_confirmo_en END,
    entrega_cerrada_admin_en = CASE WHEN p_modo = 'ADMIN' THEN NOW() ELSE entrega_cerrada_admin_en END,
    entrega_cerrada_local_en = CASE WHEN p_modo = 'LOCAL' THEN NOW() ELSE entrega_cerrada_local_en END
  WHERE id = p_sub_pedido;

  INSERT INTO pedido_estado_historial (sub_pedido_id, estado, cambiado_por, notas)
  VALUES (p_sub_pedido, 'ENTREGADO', p_actor,
    COALESCE(NULLIF(p_nota, ''), CASE p_modo WHEN 'ADMIN' THEN 'Cierre manual por administrador' WHEN 'LOCAL' THEN 'Confirmación de entrega por el local (autopedido)' ELSE 'Entrega confirmada por el cliente' END));

  -- Coordinar con los registros de pago usando la misma fila como bloqueo por beneficiario.
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
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado = 'EN_CAMINO') THEN 'EN_CAMINO'
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado = 'LISTO') THEN 'LISTO'
    WHEN EXISTS (SELECT 1 FROM sub_pedidos s WHERE s.pedido_id = p.id AND s.estado IN ('ACEPTADO', 'PREPARANDO')) THEN 'ACEPTADO'
    ELSE 'PENDIENTE' END,
    actualizado_en = NOW()
  WHERE p.id = v_sub.pedido_id;
  RETURN v_sub.pedido_id;
END;
$$;

CREATE OR REPLACE FUNCTION registrar_pago_comision(
  p_tipo VARCHAR, p_beneficiario UUID, p_monto NUMERIC, p_admin UUID, p_nota TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_saldo NUMERIC(12,2);
  v_pago UUID := gen_random_uuid();
BEGIN
  IF p_tipo = 'LOCAL' THEN
    PERFORM 1 FROM restaurantes WHERE id = p_beneficiario FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Local no encontrado'; END IF;
  ELSIF p_tipo = 'DRIVER' THEN
    PERFORM 1 FROM usuarios WHERE id = p_beneficiario AND role = 'DRIVER' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Driver no encontrado'; END IF;
  ELSE
    RAISE EXCEPTION 'Tipo de beneficiario inválido';
  END IF;

  SELECT COALESCE((SELECT SUM(monto) FROM comisiones_generadas
    WHERE beneficiario_tipo = p_tipo AND beneficiario_id = p_beneficiario), 0)
    - COALESCE((SELECT SUM(monto) FROM comision_pagos
    WHERE beneficiario_tipo = p_tipo AND beneficiario_id = p_beneficiario), 0)
    INTO v_saldo;

  IF p_monto IS NULL OR p_monto <= 0 OR p_monto > v_saldo THEN
    RAISE EXCEPTION 'El pago debe ser mayor a cero y no superar el saldo pendiente (S/ %)', v_saldo;
  END IF;

  INSERT INTO comision_pagos (id, beneficiario_tipo, beneficiario_id, monto, registrado_por, nota)
  VALUES (v_pago, p_tipo, p_beneficiario, p_monto, p_admin, NULLIF(p_nota, ''));
  RETURN v_pago;
END;
$$;

-- Separa la regla del local para pedidos normales y autopedidos preferenciales.
-- Las reglas normales existentes se conservan; la última regla normal de cada local
-- se copia una sola vez como regla inicial de autopedido para no cambiar su tasa actual.
-- Los montos ya guardados en sub_pedidos y las deudas históricas no se recalculan.

BEGIN;

ALTER TABLE comision_reglas
  ADD COLUMN IF NOT EXISTS tipo_pedido VARCHAR(12) NOT NULL DEFAULT 'NORMAL';

ALTER TABLE sub_pedidos
  ADD COLUMN IF NOT EXISTS tipo_pedido VARCHAR(12) NOT NULL DEFAULT 'NORMAL';

ALTER TABLE sub_pedidos
  DROP CONSTRAINT IF EXISTS sub_pedidos_tipo_pedido_check;
ALTER TABLE sub_pedidos
  ADD CONSTRAINT sub_pedidos_tipo_pedido_check
  CHECK (tipo_pedido IN ('NORMAL', 'AUTOPEDIDO'));

-- Identifica autopedidos históricos sin modificar su subtotal o comisión guardada.
UPDATE sub_pedidos
SET tipo_pedido = 'AUTOPEDIDO'
WHERE direccion_snapshot->>'etiqueta' = 'Autopedido'
  AND tipo_pedido <> 'AUTOPEDIDO';

ALTER TABLE comision_reglas
  DROP CONSTRAINT IF EXISTS comision_reglas_tipo_pedido_check;
ALTER TABLE comision_reglas
  ADD CONSTRAINT comision_reglas_tipo_pedido_check
  CHECK (tipo_pedido IN ('NORMAL', 'AUTOPEDIDO'));

ALTER TABLE comision_reglas
  DROP CONSTRAINT IF EXISTS comision_reglas_tipo_beneficiario_pedido_check;
ALTER TABLE comision_reglas
  ADD CONSTRAINT comision_reglas_tipo_beneficiario_pedido_check
  CHECK (beneficiario_tipo = 'LOCAL' OR tipo_pedido = 'NORMAL');

CREATE INDEX IF NOT EXISTS idx_comision_reglas_local_tipo_fecha
  ON comision_reglas (restaurante_id, tipo_pedido, creado_en DESC, id DESC)
  WHERE beneficiario_tipo = 'LOCAL';

WITH ultima_regla_normal AS (
  SELECT DISTINCT ON (restaurante_id)
         restaurante_id, modalidad, valor, creado_por
  FROM comision_reglas
  WHERE beneficiario_tipo = 'LOCAL' AND tipo_pedido = 'NORMAL'
  ORDER BY restaurante_id, creado_en DESC, id DESC
)
INSERT INTO comision_reglas
  (beneficiario_tipo, restaurante_id, tipo_pedido, modalidad, valor, creado_por)
SELECT 'LOCAL', normal.restaurante_id, 'AUTOPEDIDO', normal.modalidad, normal.valor, normal.creado_por
FROM ultima_regla_normal normal
WHERE NOT EXISTS (
  SELECT 1 FROM comision_reglas auto
  WHERE auto.beneficiario_tipo = 'LOCAL'
    AND auto.restaurante_id = normal.restaurante_id
    AND auto.tipo_pedido = 'AUTOPEDIDO'
);

COMMIT;

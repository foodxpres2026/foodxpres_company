-- Extra manual de delivery por cada subpedido/local.
-- El importe queda congelado en el subpedido para conservar el precio cobrado.
BEGIN;

ALTER TABLE configuracion_sistema
  ADD COLUMN IF NOT EXISTS recargo_delivery NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE sub_pedidos
  ADD COLUMN IF NOT EXISTS recargo_delivery NUMERIC(10,2) NOT NULL DEFAULT 0;

-- La comisión del driver se calcula sobre la tarifa base, sin el extra que recibe.
CREATE OR REPLACE FUNCTION fijar_base_comision_driver_sin_recargo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_base NUMERIC(10,2);
BEGIN
  IF NEW.beneficiario_tipo = 'DRIVER' THEN
    SELECT GREATEST(sp.costo_envio - COALESCE(sp.recargo_delivery, 0), 0)
      INTO v_base
    FROM sub_pedidos sp
    WHERE sp.id = NEW.sub_pedido_id AND sp.driver_id = NEW.beneficiario_id;
    IF FOUND THEN NEW.base := v_base; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comision_driver_base_sin_recargo ON comisiones_generadas;
CREATE TRIGGER trg_comision_driver_base_sin_recargo
  BEFORE INSERT ON comisiones_generadas
  FOR EACH ROW EXECUTE FUNCTION fijar_base_comision_driver_sin_recargo();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'configuracion_sistema_recargo_delivery_check'
      AND conrelid = 'configuracion_sistema'::regclass
  ) THEN
    ALTER TABLE configuracion_sistema
      ADD CONSTRAINT configuracion_sistema_recargo_delivery_check
      CHECK (recargo_delivery >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sub_pedidos_recargo_delivery_check'
      AND conrelid = 'sub_pedidos'::regclass
  ) THEN
    ALTER TABLE sub_pedidos
      ADD CONSTRAINT sub_pedidos_recargo_delivery_check
      CHECK (recargo_delivery >= 0);
  END IF;
END $$;

COMMIT;

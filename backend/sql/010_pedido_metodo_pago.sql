-- Guarda el método y los datos necesarios para cobrar cada pedido.
-- Aplicar en Neon antes de desplegar los cambios de checkout.
BEGIN;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(12) NOT NULL DEFAULT 'EFECTIVO',
  ADD COLUMN IF NOT EXISTS paga_con NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_metodo_pago_check'
      AND conrelid = 'pedidos'::regclass
  ) THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_metodo_pago_check
      CHECK (metodo_pago IN ('EFECTIVO', 'YAPE', 'PLIN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_pago_efectivo_check'
      AND conrelid = 'pedidos'::regclass
  ) THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_pago_efectivo_check
      CHECK (paga_con IS NULL OR paga_con >= total);
  END IF;
END $$;

COMMIT;

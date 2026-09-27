-- FoodXpres: registrar el origen del pedido y los hitos del driver.
-- Seguro para ejecutar más de una vez; no elimina ni reescribe pedidos.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'APP',
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id);

ALTER TABLE sub_pedidos
  ADD COLUMN IF NOT EXISTS driver_asignado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_llego_en TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_origen_check'
      AND conrelid = 'pedidos'::regclass
  ) THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_origen_check
      CHECK (origen IN ('APP', 'AUTOPEDIDO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_origen_creado
  ON pedidos(origen, creado_en DESC);

-- Admin selects which of the two FoodXpres delivery price tables is active.
-- Delivery distances themselves are calculated from route data and are not persisted here.
ALTER TABLE configuracion_sistema
  ADD COLUMN IF NOT EXISTS tarifa_delivery_metodo VARCHAR(12) NOT NULL DEFAULT 'DETALLADA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'configuracion_sistema_tarifa_delivery_metodo_check'
      AND conrelid = 'configuracion_sistema'::regclass
  ) THEN
    ALTER TABLE configuracion_sistema
      ADD CONSTRAINT configuracion_sistema_tarifa_delivery_metodo_check
      CHECK (tarifa_delivery_metodo IN ('DETALLADA', 'GENERAL'));
  END IF;
END $$;

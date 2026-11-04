-- Guarda el resultado de la verificación Firebase para clientes nuevos.
-- Las cuentas existentes quedan como no verificadas y conservan su acceso actual.
-- Revisar la estructura de Neon y respaldar antes de aplicar en producción.
BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS celular_verificado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS celular_verificado_en TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_celular_verificacion_check'
      AND conrelid = 'usuarios'::regclass
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_celular_verificacion_check
      CHECK (
        (celular_verificado = FALSE AND celular_verificado_en IS NULL)
        OR (celular_verificado = TRUE AND celular_verificado_en IS NOT NULL)
      );
  END IF;
END $$;

COMMIT;

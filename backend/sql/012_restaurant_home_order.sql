-- Orden manual de restaurantes en la web cliente.
-- Aplicar en Neon antes de desplegar el código que lee orden_inicio.

ALTER TABLE restaurantes
  ADD COLUMN IF NOT EXISTS orden_inicio INTEGER NOT NULL DEFAULT 0;

WITH orden_inicial AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY creado_en DESC, id)::INTEGER - 1 AS posicion
  FROM restaurantes
)
UPDATE restaurantes r
SET orden_inicio = orden_inicial.posicion
FROM orden_inicial
WHERE r.id = orden_inicial.id;

CREATE INDEX IF NOT EXISTS idx_restaurantes_orden_inicio
  ON restaurantes (orden_inicio, creado_en DESC);

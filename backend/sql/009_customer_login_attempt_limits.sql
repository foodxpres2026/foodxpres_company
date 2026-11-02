-- Límites compartidos de intentos de inicio de sesión de clientes.
-- Los identificadores se guardan como HMAC, nunca como celular o IP en claro.
CREATE TABLE IF NOT EXISTS customer_login_attempt_limits (
  bucket_hash       CHAR(64) PRIMARY KEY,
  failure_count     INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until     TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_login_attempt_limits_updated
  ON customer_login_attempt_limits(updated_at);

-- ============================================================
-- FOODXPRES — ESQUEMA INICIAL
-- PostgreSQL (Neon) · 13/09/2026
-- 21 tablas · incluye timestamps, notas y sub-pedidos
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USUARIOS (unificado para las 4 apps)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role            VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
  email           VARCHAR(255) UNIQUE,
  celular         VARCHAR(9) UNIQUE,
  password_hash   VARCHAR(255),
  nombre          VARCHAR(120) NOT NULL,
  avatar_url      TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_role_check
    CHECK (role IN ('ADMIN','STAFF','DRIVER','CUSTOMER')),
  CONSTRAINT usuarios_login_check
    CHECK (celular IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_role    ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_celular ON usuarios(celular);

-- ============================================================
-- 2. DIRECCIONES DEL CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS direcciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  etiqueta           VARCHAR(40) NOT NULL,
  direccion          TEXT NOT NULL,
  referencia         TEXT,
  lat                NUMERIC(9,6),
  lng                NUMERIC(9,6),
  es_predeterminada  BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones(usuario_id);

-- ============================================================
-- 3. DRIVER — info extra del repartidor
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_detalles (
  usuario_id      UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  vehiculo        VARCHAR(60),
  placa           VARCHAR(20),
  licencia        VARCHAR(40),
  disponible      BOOLEAN NOT NULL DEFAULT TRUE,
  lat_actual      NUMERIC(9,6),
  lng_actual      NUMERIC(9,6),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. RESTAURANTES
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurantes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
  slug             VARCHAR(60) UNIQUE NOT NULL,
  nombre           VARCHAR(120) NOT NULL,
  subtitulo        VARCHAR(160),
  direccion_fisica TEXT,
  referencia       TEXT,
  lat              NUMERIC(9,6),
  lng              NUMERIC(9,6),
  celular          VARCHAR(9),
  logo_url         TEXT,
  banner_url       TEXT,
  tiempo_estimado  VARCHAR(20),
  monto_minimo     NUMERIC(8,2) NOT NULL DEFAULT 5.00,
  calificacion     NUMERIC(2,1) NOT NULL DEFAULT 0,
  num_resenas      INTEGER NOT NULL DEFAULT 0,
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. CATEGORÍAS (globales: tacos, alitas, chifa...)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug   VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  emoji  VARCHAR(10),
  orden  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 6. RESTAURANTES ↔ CATEGORÍAS (N:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurantes_categorias (
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  categoria_id   UUID NOT NULL REFERENCES categorias(id)   ON DELETE CASCADE,
  PRIMARY KEY (restaurante_id, categoria_id)
);

-- ============================================================
-- 7. HORARIOS DE ATENCIÓN (por día de semana)
-- ============================================================
CREATE TABLE IF NOT EXISTS horarios_atencion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  dia             VARCHAR(3) NOT NULL,
  hora_apertura   TIME,
  hora_cierre     TIME,
  UNIQUE (restaurante_id, dia),
  CONSTRAINT horarios_dia_check
    CHECK (dia IN ('lun','mar','mie','jue','vie','sab','dom'))
);

-- ============================================================
-- 8. SUBCATEGORÍAS (por restaurante: bebidas, licores, entradas)
-- ============================================================
CREATE TABLE IF NOT EXISTS subcategorias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nombre          VARCHAR(80) NOT NULL,
  orden           INTEGER NOT NULL DEFAULT 0,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcategorias_rest ON subcategorias(restaurante_id);

-- ============================================================
-- 9. PLATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS platos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id   UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  subcategoria_id  UUID REFERENCES subcategorias(id) ON DELETE SET NULL,
  nombre           VARCHAR(120) NOT NULL,
  descripcion      TEXT,
  precio           NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
  imagen_url       TEXT,
  tiempo_estimado  INTEGER,
  disponible       BOOLEAN NOT NULL DEFAULT TRUE,
  orden            INTEGER NOT NULL DEFAULT 0,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platos_restaurante ON platos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_platos_subcategoria ON platos(subcategoria_id);

-- ============================================================
-- 10. GRUPOS DE OPCIONES (ej: "Sabor de alitas")
-- ============================================================
CREATE TABLE IF NOT EXISTS grupos_opciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plato_id   UUID NOT NULL REFERENCES platos(id) ON DELETE CASCADE,
  titulo     VARCHAR(120) NOT NULL,
  requerido  BOOLEAN NOT NULL DEFAULT FALSE,
  minimo     INTEGER NOT NULL DEFAULT 0,
  maximo     INTEGER NOT NULL DEFAULT 1,
  orden      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_grupos_opciones_plato ON grupos_opciones(plato_id);

-- ============================================================
-- 11. OPCIONES CHOICES (BBQ, Buffalo, Sapo, Huancaína...)
-- ============================================================
CREATE TABLE IF NOT EXISTS opciones_choices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id        UUID NOT NULL REFERENCES grupos_opciones(id) ON DELETE CASCADE,
  nombre          VARCHAR(80) NOT NULL,
  precio_extra    NUMERIC(8,2) NOT NULL DEFAULT 0,
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_opciones_choices_grupo ON opciones_choices(grupo_id);

-- ============================================================
-- 12. PEDIDOS (padre — agrupa todos los locales)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_envio     NUMERIC(10,2) NOT NULL DEFAULT 0,
  propina         NUMERIC(10,2) NOT NULL DEFAULT 0,
  vip             BOOLEAN NOT NULL DEFAULT FALSE,
  costo_vip       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  notas           TEXT,
  estado_global   VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado  ON pedidos(creado_en DESC);

-- ============================================================
-- 13. SUB-PEDIDOS (uno por local)
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  restaurante_id      UUID NOT NULL REFERENCES restaurantes(id),
  driver_id           UUID REFERENCES usuarios(id),
  estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_envio         NUMERIC(10,2) NOT NULL DEFAULT 0,
  distancia_km        NUMERIC(6,2),
  tiempo_estimado     INTEGER,
  direccion_snapshot  JSONB,
  notas               TEXT,
  motivo_rechazo      TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aceptado_en         TIMESTAMPTZ,
  listo_en            TIMESTAMPTZ,
  recogido_en         TIMESTAMPTZ,
  entregado_en        TIMESTAMPTZ,
  CONSTRAINT sub_pedidos_estado_check
    CHECK (estado IN ('PENDIENTE','ACEPTADO','PREPARANDO','LISTO',
                      'ASIGNADO','EN_CAMINO','ENTREGADO','RECHAZADO','CANCELADO'))
);

CREATE INDEX IF NOT EXISTS idx_subpedidos_pedido  ON sub_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_subpedidos_rest    ON sub_pedidos(restaurante_id, estado);
CREATE INDEX IF NOT EXISTS idx_subpedidos_driver  ON sub_pedidos(driver_id, estado);

-- ============================================================
-- 14. PEDIDO ITEMS (detalle por local)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_pedido_id    UUID NOT NULL REFERENCES sub_pedidos(id) ON DELETE CASCADE,
  plato_id         UUID REFERENCES platos(id),
  nombre_snapshot  VARCHAR(120) NOT NULL,
  precio_snapshot  NUMERIC(8,2) NOT NULL,
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  subtotal         NUMERIC(10,2) NOT NULL,
  notas            TEXT,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_subpedido ON pedido_items(sub_pedido_id);

-- ============================================================
-- 15. ITEM OPCIONES (snapshot de las opciones elegidas)
-- ============================================================
CREATE TABLE IF NOT EXISTS item_opciones (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                UUID NOT NULL REFERENCES pedido_items(id) ON DELETE CASCADE,
  grupo_titulo_snapshot  VARCHAR(120) NOT NULL,
  choice_nombre_snapshot VARCHAR(80) NOT NULL,
  precio_extra           NUMERIC(8,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_item_opciones_item ON item_opciones(item_id);

-- ============================================================
-- 16. HISTORIAL DE ESTADOS (auditoría completa)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_estado_historial (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_pedido_id  UUID NOT NULL REFERENCES sub_pedidos(id) ON DELETE CASCADE,
  estado         VARCHAR(20) NOT NULL,
  cambiado_por   UUID REFERENCES usuarios(id),
  notas          TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_subpedido ON pedido_estado_historial(sub_pedido_id);

-- ============================================================
-- 17. CONFIGURACIÓN DEL SISTEMA (fila única)
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id                      SMALLINT PRIMARY KEY DEFAULT 1,
  tarifa_base             NUMERIC(6,2) NOT NULL DEFAULT 2.00,
  precio_por_km           NUMERIC(6,2) NOT NULL DEFAULT 2.00,
  costo_vip               NUMERIC(6,2) NOT NULL DEFAULT 2.30,
  monto_minimo_global     NUMERIC(6,2) NOT NULL DEFAULT 5.00,
  tiempo_max_aceptacion   INTEGER NOT NULL DEFAULT 5,
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT config_sistema_solo_una_fila CHECK (id = 1)
);

INSERT INTO configuracion_sistema (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- 18. NOTIFICACIONES (in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sub_pedido_id  UUID REFERENCES sub_pedidos(id) ON DELETE CASCADE,
  tipo           VARCHAR(30) NOT NULL,
  titulo         VARCHAR(120) NOT NULL,
  mensaje        TEXT NOT NULL,
  leida          BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_id, creado_en DESC);

-- ============================================================
-- 19. PUSH TOKENS (FCM)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  plataforma  VARCHAR(20) NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_tokens_plataforma_check
    CHECK (plataforma IN ('android','ios','web'))
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON push_tokens(usuario_id);

-- ============================================================
-- 20. OTP CODES (para verificación por SMS en el futuro)
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celular    VARCHAR(9) NOT NULL,
  codigo     VARCHAR(6) NOT NULL,
  expira_en  TIMESTAMPTZ NOT NULL,
  usado      BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_celular ON otp_codes(celular);

-- ============================================================
-- 21. FAVORITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id      UUID NOT NULL REFERENCES usuarios(id)     ON DELETE CASCADE,
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, restaurante_id)
);

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
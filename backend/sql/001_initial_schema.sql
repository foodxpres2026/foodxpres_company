-- ============================================================
-- FOODXPRES / MOTO MOTO — ESQUEMA INICIAL UNIFICADO
-- PostgreSQL (Neon) · 11/09/2026
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USUARIOS UNIFICADOS (login de las 4 apps)
-- ============================================================
-- role:
--   CUSTOMER  → cliente (web-clientes)
--   ADMIN     → administrador global (web-admin)
--   STAFF     → staff/owner de un restaurante (app-local)
--   DRIVER    → repartidor (app-driver)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
  celular       VARCHAR(9) UNIQUE,                 -- login por celular (clientes y staff)
  email         VARCHAR(255) UNIQUE,               -- login por email (admins)
  password_hash VARCHAR(255),                      -- solo para ADMIN / STAFF / DRIVER
  nombre        VARCHAR(120) NOT NULL,
  avatar_url    TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_role_check
    CHECK (role IN ('CUSTOMER','ADMIN','STAFF','DRIVER')),
  CONSTRAINT usuarios_login_check
    CHECK (celular IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_role    ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_celular ON usuarios(celular);

-- ============================================================
-- 2. OTP (verificación por SMS/WhatsApp para clientes)
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
-- 3. RESTAURANTES
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(60) UNIQUE NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  subtitulo       VARCHAR(160),
  badge_tipo      VARCHAR(20),
  badge_texto     VARCHAR(40),
  tipo_socio      VARCHAR(20) NOT NULL DEFAULT 'socio',
  calificacion    NUMERIC(2,1) NOT NULL DEFAULT 0,
  num_resenas     INTEGER NOT NULL DEFAULT 0,
  tiempo_estimado VARCHAR(20),
  monto_minimo    NUMERIC(8,2) NOT NULL DEFAULT 0,
  lat             NUMERIC(9,6),
  lng             NUMERIC(9,6),
  direccion_fisica TEXT,
  celular         VARCHAR(9),
  imagen_url      TEXT,
  logo_url        TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT restaurantes_tipo_socio_check
    CHECK (tipo_socio IN ('socio','externo'))
);

-- ============================================================
-- 4. STAFF ↔ RESTAURANTE (relación muchos-a-muchos)
-- ============================================================
-- Un usuario STAFF puede estar en 1 o más restaurantes.
CREATE TABLE IF NOT EXISTS restaurante_staff (
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  rol             VARCHAR(20) NOT NULL DEFAULT 'STAFF',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, restaurante_id),
  CONSTRAINT restaurante_staff_rol_check
    CHECK (rol IN ('OWNER','MANAGER','STAFF'))
);
CREATE INDEX IF NOT EXISTS idx_restaurante_staff_rest ON restaurante_staff(restaurante_id);

-- ============================================================
-- 5. CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug   VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurantes_categorias (
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  categoria_id   UUID NOT NULL REFERENCES categorias(id)   ON DELETE CASCADE,
  PRIMARY KEY (restaurante_id, categoria_id)
);

-- ============================================================
-- 6. TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto VARCHAR(60) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurantes_tags (
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  tag_id         UUID NOT NULL REFERENCES tags(id)         ON DELETE CASCADE,
  PRIMARY KEY (restaurante_id, tag_id)
);

-- ============================================================
-- 7. HORARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS horarios_atencion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  dia             VARCHAR(3) NOT NULL,   -- 'dom','lun','mar','mie','jue','vie','sab'
  hora_apertura   TIME,
  hora_cierre     TIME,
  UNIQUE (restaurante_id, dia),
  CONSTRAINT horarios_dia_check
    CHECK (dia IN ('dom','lun','mar','mie','jue','vie','sab'))
);

-- ============================================================
-- 8. PLATOS (productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS platos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  slug            VARCHAR(20) NOT NULL,
  categoria       VARCHAR(60) NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  descripcion     TEXT,
  precio          NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
  calificacion    NUMERIC(2,1) NOT NULL DEFAULT 0,
  num_resenas     INTEGER NOT NULL DEFAULT 0,
  imagen_url      TEXT,
  disponible      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurante_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_platos_restaurante ON platos(restaurante_id);

-- ============================================================
-- 9. GRUPOS DE OPCIONES Y CHOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS grupos_opciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plato_id    UUID NOT NULL REFERENCES platos(id) ON DELETE CASCADE,
  titulo      VARCHAR(120) NOT NULL,
  requerido   BOOLEAN NOT NULL DEFAULT FALSE,
  minimo      INTEGER NOT NULL DEFAULT 0,
  maximo      INTEGER NOT NULL DEFAULT 1,
  orden       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_grupos_opciones_plato ON grupos_opciones(plato_id);

CREATE TABLE IF NOT EXISTS opciones_choices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_opciones_id  UUID NOT NULL REFERENCES grupos_opciones(id) ON DELETE CASCADE,
  etiqueta           VARCHAR(80) NOT NULL,
  precio_delta       NUMERIC(8,2) NOT NULL DEFAULT 0,
  orden              INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_opciones_choices_grupo ON opciones_choices(grupo_opciones_id);

-- ============================================================
-- 10. DIRECCIONES DEL CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS direcciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  etiqueta           VARCHAR(40) NOT NULL,
  direccion          TEXT NOT NULL,
  nota_direccion     TEXT,
  referencia         TEXT,
  lat                NUMERIC(9,6),
  lng                NUMERIC(9,6),
  es_predeterminada  BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones(usuario_id);

-- ============================================================
-- 11. PROMOCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS promociones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge         VARCHAR(40),
  titulo        VARCHAR(80) NOT NULL,
  subtitulo     VARCHAR(120),
  descripcion   TEXT,
  cta_texto     VARCHAR(40),
  imagen_url    TEXT,
  gradiente_css VARCHAR(160),
  orden         INTEGER NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. CONFIGURACIÓN DE ENVÍO
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion_envio (
  id                     SMALLINT PRIMARY KEY DEFAULT 1,
  precio_por_km          NUMERIC(6,2) NOT NULL DEFAULT 3.00,
  tarifa_minima          NUMERIC(6,2) NOT NULL DEFAULT 6.00,
  recargo_local_externo  NUMERIC(6,2) NOT NULL DEFAULT 1.50,
  actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT config_envio_solo_una_fila CHECK (id = 1)
);
INSERT INTO configuracion_envio (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- 13. PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                VARCHAR(20) UNIQUE NOT NULL,
  usuario_id            UUID NOT NULL REFERENCES usuarios(id),
  restaurante_id        UUID NOT NULL REFERENCES restaurantes(id),
  driver_id             UUID REFERENCES usuarios(id),
  direccion_id          UUID REFERENCES direcciones(id),

  -- snapshots de la dirección al momento del pedido
  direccion_etiqueta    VARCHAR(40),
  direccion_texto       TEXT,
  direccion_nota        TEXT,
  direccion_referencia  TEXT,
  direccion_lat         NUMERIC(9,6),
  direccion_lng         NUMERIC(9,6),

  -- snapshots del cliente
  cliente_nombre        VARCHAR(120) NOT NULL,
  cliente_celular       VARCHAR(9)   NOT NULL,

  -- montos
  subtotal              NUMERIC(8,2) NOT NULL,
  costo_envio           NUMERIC(8,2) NOT NULL DEFAULT 0,
  propina               NUMERIC(8,2) NOT NULL DEFAULT 0,
  tarifa_vip            NUMERIC(8,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(8,2) NOT NULL CHECK (total >= 0),

  -- estado
  estado_actual         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  tiempo_estimado       INTEGER,           -- minutos
  motivo_rechazo        TEXT,
  nota                  TEXT,

  -- timestamps de estado
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aceptado_en           TIMESTAMPTZ,
  listo_en              TIMESTAMPTZ,
  recogido_en           TIMESTAMPTZ,
  entregado_en          TIMESTAMPTZ,

  CONSTRAINT pedidos_estado_check CHECK (estado_actual IN (
    'PENDIENTE','ACEPTADO','PREPARANDO','LISTO',
    'ASIGNADO','EN_CAMINO','ENTREGADO','RECHAZADO','CANCELADO'
  ))
);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado      ON pedidos(estado_actual);
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante ON pedidos(restaurante_id, estado_actual);
CREATE INDEX IF NOT EXISTS idx_pedidos_driver      ON pedidos(driver_id, estado_actual);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario     ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado      ON pedidos(creado_en DESC);

-- ============================================================
-- 14. ITEMS DEL PEDIDO (snapshot)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  plato_id            UUID REFERENCES platos(id),
  restaurante_id      UUID REFERENCES restaurantes(id),
  plato_nombre        VARCHAR(120) NOT NULL,
  restaurante_nombre  VARCHAR(120) NOT NULL,
  cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario     NUMERIC(8,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal            NUMERIC(8,2) NOT NULL CHECK (subtotal >= 0),
  selecciones         JSONB
);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);

-- ============================================================
-- 15. HISTORIAL DE ESTADOS DEL PEDIDO
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_estado_historial (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado      VARCHAR(20) NOT NULL,
  cambiado_por UUID REFERENCES usuarios(id),
  notas       TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedido_hist_pedido ON pedido_estado_historial(pedido_id);

-- ============================================================
-- 16. NOTIFICACIONES (in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pedido_id   UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) NOT NULL,
  titulo      VARCHAR(120) NOT NULL,
  mensaje     TEXT NOT NULL,
  leida       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_id, creado_en DESC);

-- ============================================================
-- 17. PUSH TOKENS (FCM)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  plataforma VARCHAR(20) NOT NULL,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_tokens_plataforma_check
    CHECK (plataforma IN ('android','ios','web'))
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON push_tokens(usuario_id);

-- ============================================================
-- 18. DRIVERS (info extra del repartidor)
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  usuario_id    UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  vehiculo      VARCHAR(60),
  placa         VARCHAR(20),
  licencia      VARCHAR(40),
  disponible    BOOLEAN NOT NULL DEFAULT TRUE,
  lat_actual    NUMERIC(9,6),
  lng_actual    NUMERIC(9,6),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 19. FAVORITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id     UUID NOT NULL REFERENCES usuarios(id)     ON DELETE CASCADE,
  restaurante_id UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, restaurante_id)
);

-- ============================================================
-- FIN
-- ============================================================
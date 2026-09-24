-- ============================================================
-- ESQUEMA REAL DE LA BD VIEJA
-- Generado automáticamente el 2026-09-24T14:05:32.166Z
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  slug VARCHAR(40) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  emoji VARCHAR(10),
  orden INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id SMALLINT DEFAULT 1 NOT NULL,
  tarifa_base NUMERIC(6,2) DEFAULT 2.00 NOT NULL,
  precio_por_km NUMERIC(6,2) DEFAULT 2.00 NOT NULL,
  costo_vip NUMERIC(6,2) DEFAULT 2.30 NOT NULL,
  monto_minimo_global NUMERIC(6,2) DEFAULT 5.00 NOT NULL,
  tiempo_max_aceptacion INTEGER DEFAULT 5 NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS direcciones (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  usuario_id UUID NOT NULL,
  etiqueta VARCHAR(40) NOT NULL,
  direccion TEXT NOT NULL,
  referencia TEXT,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  es_predeterminada BOOLEAN DEFAULT false NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE direcciones ADD CONSTRAINT direcciones_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS driver_detalles (
  usuario_id UUID NOT NULL,
  vehiculo VARCHAR(60),
  placa VARCHAR(20),
  licencia VARCHAR(40),
  disponible BOOLEAN DEFAULT true NOT NULL,
  lat_actual NUMERIC(9,6),
  lng_actual NUMERIC(9,6),
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (usuario_id)
);

ALTER TABLE driver_detalles ADD CONSTRAINT driver_detalles_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id UUID NOT NULL,
  restaurante_id UUID NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (usuario_id, restaurante_id)
);

ALTER TABLE favoritos ADD CONSTRAINT favoritos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE favoritos ADD CONSTRAINT favoritos_restaurante_id_fkey
  FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
CREATE TABLE IF NOT EXISTS grupos_opciones (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  plato_id UUID NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  requerido BOOLEAN DEFAULT false NOT NULL,
  minimo INTEGER DEFAULT 0 NOT NULL,
  maximo INTEGER DEFAULT 1 NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_plato_id_fkey
  FOREIGN KEY (plato_id) REFERENCES platos(id);
CREATE TABLE IF NOT EXISTS horarios_atencion (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  restaurante_id UUID NOT NULL,
  dia VARCHAR(3) NOT NULL,
  hora_apertura TIME WITHOUT TIME ZONE,
  hora_cierre TIME WITHOUT TIME ZONE,
  PRIMARY KEY (id)
);

ALTER TABLE horarios_atencion ADD CONSTRAINT horarios_atencion_restaurante_id_fkey
  FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
CREATE TABLE IF NOT EXISTS item_opciones (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  item_id UUID NOT NULL,
  grupo_titulo_snapshot VARCHAR(120) NOT NULL,
  choice_nombre_snapshot VARCHAR(80) NOT NULL,
  precio_extra NUMERIC(8,2) DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE item_opciones ADD CONSTRAINT item_opciones_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES pedido_items(id);
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  usuario_id UUID NOT NULL,
  sub_pedido_id UUID,
  tipo VARCHAR(30) NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_sub_pedido_id_fkey
  FOREIGN KEY (sub_pedido_id) REFERENCES sub_pedidos(id);
CREATE TABLE IF NOT EXISTS opciones_choices (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  grupo_id UUID NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  precio_extra NUMERIC(8,2) DEFAULT 0 NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE opciones_choices ADD CONSTRAINT opciones_choices_grupo_id_fkey
  FOREIGN KEY (grupo_id) REFERENCES grupos_opciones(id);
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  celular VARCHAR(9) NOT NULL,
  codigo VARCHAR(6) NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  usado BOOLEAN DEFAULT false NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS pedido_estado_historial (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  sub_pedido_id UUID NOT NULL,
  estado VARCHAR(20) NOT NULL,
  cambiado_por UUID,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE pedido_estado_historial ADD CONSTRAINT pedido_estado_historial_sub_pedido_id_fkey
  FOREIGN KEY (sub_pedido_id) REFERENCES sub_pedidos(id);
ALTER TABLE pedido_estado_historial ADD CONSTRAINT pedido_estado_historial_cambiado_por_fkey
  FOREIGN KEY (cambiado_por) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS pedido_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  sub_pedido_id UUID NOT NULL,
  plato_id UUID,
  nombre_snapshot VARCHAR(120) NOT NULL,
  precio_snapshot NUMERIC(8,2) NOT NULL,
  cantidad INTEGER NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_sub_pedido_id_fkey
  FOREIGN KEY (sub_pedido_id) REFERENCES sub_pedidos(id);
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_plato_id_fkey
  FOREIGN KEY (plato_id) REFERENCES platos(id);
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  usuario_id UUID NOT NULL,
  subtotal NUMERIC(10,2) DEFAULT 0 NOT NULL,
  total_envio NUMERIC(10,2) DEFAULT 0 NOT NULL,
  propina NUMERIC(10,2) DEFAULT 0 NOT NULL,
  vip BOOLEAN DEFAULT false NOT NULL,
  costo_vip NUMERIC(10,2) DEFAULT 0 NOT NULL,
  total NUMERIC(10,2) DEFAULT 0 NOT NULL,
  notas TEXT,
  estado_global VARCHAR(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE pedidos ADD CONSTRAINT pedidos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS platos (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  restaurante_id UUID NOT NULL,
  subcategoria_id UUID,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(8,2) NOT NULL,
  imagen_url TEXT,
  tiempo_estimado INTEGER,
  disponible BOOLEAN DEFAULT true NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE platos ADD CONSTRAINT platos_restaurante_id_fkey
  FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
ALTER TABLE platos ADD CONSTRAINT platos_subcategoria_id_fkey
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id);
CREATE TABLE IF NOT EXISTS promociones (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  badge VARCHAR(40),
  titulo VARCHAR(80) NOT NULL,
  subtitulo VARCHAR(120),
  descripcion TEXT,
  cta_texto VARCHAR(40),
  imagen_url TEXT,
  gradiente_css VARCHAR(160),
  orden INTEGER DEFAULT 0 NOT NULL,
  activo BOOLEAN DEFAULT true NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  usuario_id UUID NOT NULL,
  token TEXT NOT NULL,
  user_agent TEXT,
  activo BOOLEAN DEFAULT true NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  usuario_id UUID NOT NULL,
  token TEXT NOT NULL,
  plataforma VARCHAR(20) NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS restaurantes (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  usuario_id UUID,
  slug VARCHAR(60) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  subtitulo VARCHAR(160),
  direccion_fisica TEXT,
  referencia TEXT,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  celular VARCHAR(9),
  logo_url TEXT,
  banner_url TEXT,
  tiempo_estimado VARCHAR(20),
  monto_minimo NUMERIC(8,2) DEFAULT 5.00 NOT NULL,
  calificacion NUMERIC(2,1) DEFAULT 0 NOT NULL,
  num_resenas INTEGER DEFAULT 0 NOT NULL,
  activo BOOLEAN DEFAULT true NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  costo_envio_minimo NUMERIC(6,2) DEFAULT NULL::numeric,
  PRIMARY KEY (id)
);

ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS restaurantes_categorias (
  restaurante_id UUID NOT NULL,
  categoria_id UUID NOT NULL,
  PRIMARY KEY (restaurante_id, categoria_id)
);

ALTER TABLE restaurantes_categorias ADD CONSTRAINT restaurantes_categorias_restaurante_id_fkey
  FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
ALTER TABLE restaurantes_categorias ADD CONSTRAINT restaurantes_categorias_categoria_id_fkey
  FOREIGN KEY (categoria_id) REFERENCES categorias(id);
CREATE TABLE IF NOT EXISTS rutas_cache (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  restaurante_lat NUMERIC(9,6) NOT NULL,
  restaurante_lng NUMERIC(9,6) NOT NULL,
  cliente_lat NUMERIC(9,6) NOT NULL,
  cliente_lng NUMERIC(9,6) NOT NULL,
  distancia_km NUMERIC(6,2) NOT NULL,
  duracion_min INTEGER,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS solicitudes_recuperacion (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  celular VARCHAR(9) NOT NULL,
  usuario_id UUID,
  estado VARCHAR(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
  notas TEXT,
  atendido_por UUID,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  atendido_en TIMESTAMPTZ,
  PRIMARY KEY (id)
);

ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_recuperacion_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_recuperacion_atendido_por_fkey
  FOREIGN KEY (atendido_por) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS sub_pedidos (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  pedido_id UUID NOT NULL,
  restaurante_id UUID NOT NULL,
  driver_id UUID,
  estado VARCHAR(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
  subtotal NUMERIC(10,2) DEFAULT 0 NOT NULL,
  costo_envio NUMERIC(10,2) DEFAULT 0 NOT NULL,
  distancia_km NUMERIC(6,2),
  tiempo_estimado INTEGER,
  direccion_snapshot JSONB,
  notas TEXT,
  motivo_rechazo TEXT,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  aceptado_en TIMESTAMPTZ,
  listo_en TIMESTAMPTZ,
  recogido_en TIMESTAMPTZ,
  entregado_en TIMESTAMPTZ,
  se_quedo_propina BOOLEAN DEFAULT false,
  propina_vip_monto NUMERIC(8,2) DEFAULT 0,
  PRIMARY KEY (id)
);

ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id);
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_restaurante_id_fkey
  FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES usuarios(id);
CREATE TABLE IF NOT EXISTS subcategorias (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  restaurante_id UUID NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE subcategorias ADD CONSTRAINT subcategorias_restaurante_id_fkey
  FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id);
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  role VARCHAR(20) DEFAULT 'CUSTOMER'::character varying NOT NULL,
  email VARCHAR(255),
  celular VARCHAR(9),
  password_hash VARCHAR(255),
  nombre VARCHAR(120) NOT NULL,
  avatar_url TEXT,
  activo BOOLEAN DEFAULT true NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);


-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE UNIQUE INDEX categorias_pkey ON public.categorias USING btree (id);
CREATE UNIQUE INDEX categorias_slug_key ON public.categorias USING btree (slug);
CREATE UNIQUE INDEX configuracion_sistema_pkey ON public.configuracion_sistema USING btree (id);
CREATE UNIQUE INDEX direcciones_pkey ON public.direcciones USING btree (id);
CREATE INDEX idx_direcciones_usuario ON public.direcciones USING btree (usuario_id);
CREATE UNIQUE INDEX driver_detalles_pkey ON public.driver_detalles USING btree (usuario_id);
CREATE UNIQUE INDEX favoritos_pkey ON public.favoritos USING btree (usuario_id, restaurante_id);
CREATE UNIQUE INDEX grupos_opciones_pkey ON public.grupos_opciones USING btree (id);
CREATE INDEX idx_grupos_opciones_plato ON public.grupos_opciones USING btree (plato_id);
CREATE UNIQUE INDEX horarios_atencion_pkey ON public.horarios_atencion USING btree (id);
CREATE UNIQUE INDEX horarios_atencion_restaurante_id_dia_key ON public.horarios_atencion USING btree (restaurante_id, dia);
CREATE INDEX idx_item_opciones_item ON public.item_opciones USING btree (item_id);
CREATE UNIQUE INDEX item_opciones_pkey ON public.item_opciones USING btree (id);
CREATE INDEX idx_notif_usuario ON public.notificaciones USING btree (usuario_id, creado_en DESC);
CREATE UNIQUE INDEX notificaciones_pkey ON public.notificaciones USING btree (id);
CREATE INDEX idx_opciones_choices_grupo ON public.opciones_choices USING btree (grupo_id);
CREATE UNIQUE INDEX opciones_choices_pkey ON public.opciones_choices USING btree (id);
CREATE INDEX idx_otp_celular ON public.otp_codes USING btree (celular);
CREATE UNIQUE INDEX otp_codes_pkey ON public.otp_codes USING btree (id);
CREATE INDEX idx_historial_subpedido ON public.pedido_estado_historial USING btree (sub_pedido_id);
CREATE UNIQUE INDEX pedido_estado_historial_pkey ON public.pedido_estado_historial USING btree (id);
CREATE INDEX idx_items_subpedido ON public.pedido_items USING btree (sub_pedido_id);
CREATE UNIQUE INDEX pedido_items_pkey ON public.pedido_items USING btree (id);
CREATE INDEX idx_pedidos_creado ON public.pedidos USING btree (creado_en DESC);
CREATE INDEX idx_pedidos_usuario ON public.pedidos USING btree (usuario_id);
CREATE UNIQUE INDEX pedidos_codigo_key ON public.pedidos USING btree (codigo);
CREATE UNIQUE INDEX pedidos_pkey ON public.pedidos USING btree (id);
CREATE INDEX idx_platos_restaurante ON public.platos USING btree (restaurante_id);
CREATE INDEX idx_platos_subcategoria ON public.platos USING btree (subcategoria_id);
CREATE UNIQUE INDEX platos_pkey ON public.platos USING btree (id);
CREATE INDEX idx_promociones_activo ON public.promociones USING btree (activo, orden);
CREATE UNIQUE INDEX promociones_pkey ON public.promociones USING btree (id);
CREATE INDEX idx_push_subs_usuario ON public.push_subscriptions USING btree (usuario_id, activo);
CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);
CREATE UNIQUE INDEX push_subscriptions_token_key ON public.push_subscriptions USING btree (token);
CREATE INDEX idx_push_tokens_usuario ON public.push_tokens USING btree (usuario_id);
CREATE UNIQUE INDEX push_tokens_pkey ON public.push_tokens USING btree (id);
CREATE UNIQUE INDEX push_tokens_token_key ON public.push_tokens USING btree (token);
CREATE UNIQUE INDEX restaurantes_pkey ON public.restaurantes USING btree (id);
CREATE UNIQUE INDEX restaurantes_slug_key ON public.restaurantes USING btree (slug);
CREATE UNIQUE INDEX restaurantes_usuario_id_key ON public.restaurantes USING btree (usuario_id);
CREATE UNIQUE INDEX restaurantes_categorias_pkey ON public.restaurantes_categorias USING btree (restaurante_id, categoria_id);
CREATE INDEX idx_rutas_cache_lookup ON public.rutas_cache USING btree (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng);
CREATE UNIQUE INDEX rutas_cache_pkey ON public.rutas_cache USING btree (id);
CREATE UNIQUE INDEX rutas_cache_unique ON public.rutas_cache USING btree (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng);
CREATE INDEX idx_solicitudes_celular ON public.solicitudes_recuperacion USING btree (celular);
CREATE INDEX idx_solicitudes_estado ON public.solicitudes_recuperacion USING btree (estado, creado_en DESC);
CREATE UNIQUE INDEX solicitudes_recuperacion_pkey ON public.solicitudes_recuperacion USING btree (id);
CREATE INDEX idx_subpedidos_driver ON public.sub_pedidos USING btree (driver_id, estado);
CREATE INDEX idx_subpedidos_pedido ON public.sub_pedidos USING btree (pedido_id);
CREATE INDEX idx_subpedidos_rest ON public.sub_pedidos USING btree (restaurante_id, estado);
CREATE UNIQUE INDEX sub_pedidos_pkey ON public.sub_pedidos USING btree (id);
CREATE INDEX idx_subcategorias_rest ON public.subcategorias USING btree (restaurante_id);
CREATE UNIQUE INDEX subcategorias_pkey ON public.subcategorias USING btree (id);
CREATE INDEX idx_usuarios_celular ON public.usuarios USING btree (celular);
CREATE INDEX idx_usuarios_role ON public.usuarios USING btree (role);
CREATE UNIQUE INDEX usuarios_celular_key ON public.usuarios USING btree (celular);
CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);
CREATE UNIQUE INDEX usuarios_pkey ON public.usuarios USING btree (id);

-- ============================================================
-- CONSTRAINTS CHECK
-- ============================================================

ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check ((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'STAFF'::character varying, 'DRIVER'::character varying, 'CUSTOMER'::character varying])::text[]));
ALTER TABLE usuarios ADD CONSTRAINT usuarios_login_check ((celular IS NOT NULL) OR (email IS NOT NULL));
ALTER TABLE horarios_atencion ADD CONSTRAINT horarios_dia_check ((dia)::text = ANY ((ARRAY['lun'::character varying, 'mar'::character varying, 'mie'::character varying, 'jue'::character varying, 'vie'::character varying, 'sab'::character varying, 'dom'::character varying])::text[]));
ALTER TABLE platos ADD CONSTRAINT platos_precio_check (precio >= (0)::numeric);
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_estado_check ((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'ACEPTADO'::character varying, 'PREPARANDO'::character varying, 'LISTO'::character varying, 'ASIGNADO'::character varying, 'EN_CAMINO'::character varying, 'ENTREGADO'::character varying, 'RECHAZADO'::character varying, 'CANCELADO'::character varying])::text[]));
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_cantidad_check (cantidad > 0);
ALTER TABLE configuracion_sistema ADD CONSTRAINT config_sistema_solo_una_fila (id = 1);
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_plataforma_check ((plataforma)::text = ANY ((ARRAY['android'::character varying, 'ios'::character varying, 'web'::character varying])::text[]));
ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_estado_check ((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'ATENDIDA'::character varying, 'CANCELADA'::character varying])::text[]));
ALTER TABLE usuarios ADD CONSTRAINT usuarios_id_not_null id IS NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_not_null role IS NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_nombre_not_null nombre IS NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_activo_not_null activo IS NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_id_not_null id IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_etiqueta_not_null etiqueta IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_direccion_not_null direccion IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_es_predeterminada_not_null es_predeterminada IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE direcciones ADD CONSTRAINT direcciones_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE driver_detalles ADD CONSTRAINT driver_detalles_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE driver_detalles ADD CONSTRAINT driver_detalles_disponible_not_null disponible IS NOT NULL;
ALTER TABLE driver_detalles ADD CONSTRAINT driver_detalles_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_id_not_null id IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_slug_not_null slug IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_nombre_not_null nombre IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_monto_minimo_not_null monto_minimo IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_calificacion_not_null calificacion IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_num_resenas_not_null num_resenas IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_activo_not_null activo IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE restaurantes ADD CONSTRAINT restaurantes_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE categorias ADD CONSTRAINT categorias_id_not_null id IS NOT NULL;
ALTER TABLE categorias ADD CONSTRAINT categorias_slug_not_null slug IS NOT NULL;
ALTER TABLE categorias ADD CONSTRAINT categorias_nombre_not_null nombre IS NOT NULL;
ALTER TABLE categorias ADD CONSTRAINT categorias_orden_not_null orden IS NOT NULL;
ALTER TABLE restaurantes_categorias ADD CONSTRAINT restaurantes_categorias_restaurante_id_not_null restaurante_id IS NOT NULL;
ALTER TABLE restaurantes_categorias ADD CONSTRAINT restaurantes_categorias_categoria_id_not_null categoria_id IS NOT NULL;
ALTER TABLE horarios_atencion ADD CONSTRAINT horarios_atencion_id_not_null id IS NOT NULL;
ALTER TABLE horarios_atencion ADD CONSTRAINT horarios_atencion_restaurante_id_not_null restaurante_id IS NOT NULL;
ALTER TABLE horarios_atencion ADD CONSTRAINT horarios_atencion_dia_not_null dia IS NOT NULL;
ALTER TABLE subcategorias ADD CONSTRAINT subcategorias_id_not_null id IS NOT NULL;
ALTER TABLE subcategorias ADD CONSTRAINT subcategorias_restaurante_id_not_null restaurante_id IS NOT NULL;
ALTER TABLE subcategorias ADD CONSTRAINT subcategorias_nombre_not_null nombre IS NOT NULL;
ALTER TABLE subcategorias ADD CONSTRAINT subcategorias_orden_not_null orden IS NOT NULL;
ALTER TABLE subcategorias ADD CONSTRAINT subcategorias_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_id_not_null id IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_restaurante_id_not_null restaurante_id IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_nombre_not_null nombre IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_precio_not_null precio IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_disponible_not_null disponible IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_orden_not_null orden IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE platos ADD CONSTRAINT platos_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_id_not_null id IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_plato_id_not_null plato_id IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_titulo_not_null titulo IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_requerido_not_null requerido IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_minimo_not_null minimo IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_maximo_not_null maximo IS NOT NULL;
ALTER TABLE grupos_opciones ADD CONSTRAINT grupos_opciones_orden_not_null orden IS NOT NULL;
ALTER TABLE opciones_choices ADD CONSTRAINT opciones_choices_id_not_null id IS NOT NULL;
ALTER TABLE opciones_choices ADD CONSTRAINT opciones_choices_grupo_id_not_null grupo_id IS NOT NULL;
ALTER TABLE opciones_choices ADD CONSTRAINT opciones_choices_nombre_not_null nombre IS NOT NULL;
ALTER TABLE opciones_choices ADD CONSTRAINT opciones_choices_precio_extra_not_null precio_extra IS NOT NULL;
ALTER TABLE opciones_choices ADD CONSTRAINT opciones_choices_orden_not_null orden IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_id_not_null id IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_codigo_not_null codigo IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_subtotal_not_null subtotal IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_total_envio_not_null total_envio IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_propina_not_null propina IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_vip_not_null vip IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_costo_vip_not_null costo_vip IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_total_not_null total IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_global_not_null estado_global IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_id_not_null id IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_pedido_id_not_null pedido_id IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_restaurante_id_not_null restaurante_id IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_estado_not_null estado IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_subtotal_not_null subtotal IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_costo_envio_not_null costo_envio IS NOT NULL;
ALTER TABLE sub_pedidos ADD CONSTRAINT sub_pedidos_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_id_not_null id IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_sub_pedido_id_not_null sub_pedido_id IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_nombre_snapshot_not_null nombre_snapshot IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_precio_snapshot_not_null precio_snapshot IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_cantidad_not_null cantidad IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_subtotal_not_null subtotal IS NOT NULL;
ALTER TABLE pedido_items ADD CONSTRAINT pedido_items_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE item_opciones ADD CONSTRAINT item_opciones_id_not_null id IS NOT NULL;
ALTER TABLE item_opciones ADD CONSTRAINT item_opciones_item_id_not_null item_id IS NOT NULL;
ALTER TABLE item_opciones ADD CONSTRAINT item_opciones_grupo_titulo_snapshot_not_null grupo_titulo_snapshot IS NOT NULL;
ALTER TABLE item_opciones ADD CONSTRAINT item_opciones_choice_nombre_snapshot_not_null choice_nombre_snapshot IS NOT NULL;
ALTER TABLE item_opciones ADD CONSTRAINT item_opciones_precio_extra_not_null precio_extra IS NOT NULL;
ALTER TABLE pedido_estado_historial ADD CONSTRAINT pedido_estado_historial_id_not_null id IS NOT NULL;
ALTER TABLE pedido_estado_historial ADD CONSTRAINT pedido_estado_historial_sub_pedido_id_not_null sub_pedido_id IS NOT NULL;
ALTER TABLE pedido_estado_historial ADD CONSTRAINT pedido_estado_historial_estado_not_null estado IS NOT NULL;
ALTER TABLE pedido_estado_historial ADD CONSTRAINT pedido_estado_historial_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_id_not_null id IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_tarifa_base_not_null tarifa_base IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_precio_por_km_not_null precio_por_km IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_costo_vip_not_null costo_vip IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_monto_minimo_global_not_null monto_minimo_global IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_tiempo_max_aceptacion_not_null tiempo_max_aceptacion IS NOT NULL;
ALTER TABLE configuracion_sistema ADD CONSTRAINT configuracion_sistema_actualizado_en_not_null actualizado_en IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_id_not_null id IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_not_null tipo IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_titulo_not_null titulo IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_mensaje_not_null mensaje IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_leida_not_null leida IS NOT NULL;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_id_not_null id IS NOT NULL;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_token_not_null token IS NOT NULL;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_plataforma_not_null plataforma IS NOT NULL;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_id_not_null id IS NOT NULL;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_celular_not_null celular IS NOT NULL;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_codigo_not_null codigo IS NOT NULL;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_expira_en_not_null expira_en IS NOT NULL;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_usado_not_null usado IS NOT NULL;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE favoritos ADD CONSTRAINT favoritos_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE favoritos ADD CONSTRAINT favoritos_restaurante_id_not_null restaurante_id IS NOT NULL;
ALTER TABLE favoritos ADD CONSTRAINT favoritos_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_recuperacion_id_not_null id IS NOT NULL;
ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_recuperacion_celular_not_null celular IS NOT NULL;
ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_recuperacion_estado_not_null estado IS NOT NULL;
ALTER TABLE solicitudes_recuperacion ADD CONSTRAINT solicitudes_recuperacion_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE promociones ADD CONSTRAINT promociones_id_not_null id IS NOT NULL;
ALTER TABLE promociones ADD CONSTRAINT promociones_titulo_not_null titulo IS NOT NULL;
ALTER TABLE promociones ADD CONSTRAINT promociones_orden_not_null orden IS NOT NULL;
ALTER TABLE promociones ADD CONSTRAINT promociones_activo_not_null activo IS NOT NULL;
ALTER TABLE promociones ADD CONSTRAINT promociones_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_id_not_null id IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_restaurante_lat_not_null restaurante_lat IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_restaurante_lng_not_null restaurante_lng IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_cliente_lat_not_null cliente_lat IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_cliente_lng_not_null cliente_lng IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_distancia_km_not_null distancia_km IS NOT NULL;
ALTER TABLE rutas_cache ADD CONSTRAINT rutas_cache_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_id_not_null id IS NOT NULL;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_usuario_id_not_null usuario_id IS NOT NULL;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_token_not_null token IS NOT NULL;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_activo_not_null activo IS NOT NULL;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_creado_en_not_null creado_en IS NOT NULL;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_actualizado_en_not_null actualizado_en IS NOT NULL;

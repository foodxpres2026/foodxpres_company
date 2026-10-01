# Estructura real de la base de datos

> Generado automáticamente el 2026-10-01T21:29:13.071Z. Refleja EXACTAMENTE lo que hay en la BD, no lo que dice ningún archivo .sql viejo.

**Total de tablas:** 28

---

## `categorias`  (10 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| slug | VARCHAR(40) | no | — |
| nombre | VARCHAR(60) | no | — |
| emoji | VARCHAR(10) | sí | — |
| orden | INTEGER | no | 0 |

**Primary key:** id

**Unique:** slug

**Índices:**
- `categorias_pkey`: `CREATE UNIQUE INDEX categorias_pkey ON public.categorias USING btree (id)`
- `categorias_slug_key`: `CREATE UNIQUE INDEX categorias_slug_key ON public.categorias USING btree (slug)`

---

## `comision_pagos`  (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| beneficiario_tipo | VARCHAR(10) | no | — |
| beneficiario_id | UUID | no | — |
| monto | NUMERIC(10,2) | no | — |
| registrado_por | UUID | no | — |
| nota | TEXT | sí | — |
| pagado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `registrado_por` → `usuarios.id`

**Índices:**
- `comision_pagos_pkey`: `CREATE UNIQUE INDEX comision_pagos_pkey ON public.comision_pagos USING btree (id)`
- `idx_comision_pagos_beneficiario`: `CREATE INDEX idx_comision_pagos_beneficiario ON public.comision_pagos USING btree (beneficiario_tipo, beneficiario_id, pagado_en DESC)`

---

## `comision_reglas`  (3 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| beneficiario_tipo | VARCHAR(10) | no | — |
| restaurante_id | UUID | sí | — |
| modalidad | VARCHAR(12) | no | — |
| valor | NUMERIC(10,4) | no | — |
| creado_por | UUID | sí | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | clock_timestamp() |
| tipo_pedido | VARCHAR(12) | no | 'NORMAL'::character varying |

**Primary key:** id

**Foreign keys:**
- `restaurante_id` → `restaurantes.id`
- `creado_por` → `usuarios.id`

**Índices:**
- `comision_reglas_pkey`: `CREATE UNIQUE INDEX comision_reglas_pkey ON public.comision_reglas USING btree (id)`
- `idx_comision_reglas_local_fecha`: `CREATE INDEX idx_comision_reglas_local_fecha ON public.comision_reglas USING btree (restaurante_id, creado_en DESC) WHERE ((beneficiario_tipo)::text = 'LOCAL'::text)`
- `idx_comision_reglas_driver_fecha`: `CREATE INDEX idx_comision_reglas_driver_fecha ON public.comision_reglas USING btree (creado_en DESC) WHERE ((beneficiario_tipo)::text = 'DRIVER'::text)`
- `idx_comision_reglas_local_tipo_fecha`: `CREATE INDEX idx_comision_reglas_local_tipo_fecha ON public.comision_reglas USING btree (restaurante_id, tipo_pedido, creado_en DESC, id DESC) WHERE ((beneficiario_tipo)::text = 'LOCAL'::text)`

---

## `comisiones_generadas`  (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| sub_pedido_id | UUID | no | — |
| beneficiario_tipo | VARCHAR(10) | no | — |
| beneficiario_id | UUID | no | — |
| base | NUMERIC(10,2) | no | — |
| modalidad | VARCHAR(12) | no | — |
| valor_regla | NUMERIC(10,4) | no | — |
| monto | NUMERIC(10,2) | no | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `sub_pedido_id` → `sub_pedidos.id`

**Unique:** sub_pedido_id, beneficiario_tipo

**Índices:**
- `comisiones_generadas_pkey`: `CREATE UNIQUE INDEX comisiones_generadas_pkey ON public.comisiones_generadas USING btree (id)`
- `comisiones_generadas_sub_pedido_id_beneficiario_tipo_key`: `CREATE UNIQUE INDEX comisiones_generadas_sub_pedido_id_beneficiario_tipo_key ON public.comisiones_generadas USING btree (sub_pedido_id, beneficiario_tipo)`
- `idx_comisiones_beneficiario`: `CREATE INDEX idx_comisiones_beneficiario ON public.comisiones_generadas USING btree (beneficiario_tipo, beneficiario_id, creado_en DESC)`

---

## `configuracion_sistema`  (1 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | SMALLINT | no | 1 |
| tarifa_base | NUMERIC(6,2) | no | 2.00 |
| precio_por_km | NUMERIC(6,2) | no | 2.00 |
| costo_vip | NUMERIC(6,2) | no | 2.30 |
| monto_minimo_global | NUMERIC(6,2) | no | 5.00 |
| tiempo_max_aceptacion | INTEGER | no | 5 |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| tarifa_delivery_metodo | VARCHAR(12) | no | 'DETALLADA'::character varying |

**Primary key:** id

**Índices:**
- `configuracion_sistema_pkey`: `CREATE UNIQUE INDEX configuracion_sistema_pkey ON public.configuracion_sistema USING btree (id)`

---

## `direcciones`  (41 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| usuario_id | UUID | no | — |
| etiqueta | VARCHAR(40) | no | — |
| direccion | TEXT | no | — |
| referencia | TEXT | sí | — |
| lat | NUMERIC(9,6) | sí | — |
| lng | NUMERIC(9,6) | sí | — |
| es_predeterminada | BOOLEAN | no | false |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `usuario_id` → `usuarios.id`

**Índices:**
- `direcciones_pkey`: `CREATE UNIQUE INDEX direcciones_pkey ON public.direcciones USING btree (id)`
- `idx_direcciones_usuario`: `CREATE INDEX idx_direcciones_usuario ON public.direcciones USING btree (usuario_id)`

---

## `driver_detalles`  (14 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| usuario_id | UUID | no | — |
| vehiculo | VARCHAR(60) | sí | — |
| placa | VARCHAR(20) | sí | — |
| licencia | VARCHAR(40) | sí | — |
| disponible | BOOLEAN | no | true |
| lat_actual | NUMERIC(9,6) | sí | — |
| lng_actual | NUMERIC(9,6) | sí | — |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** usuario_id

**Foreign keys:**
- `usuario_id` → `usuarios.id`

**Índices:**
- `driver_detalles_pkey`: `CREATE UNIQUE INDEX driver_detalles_pkey ON public.driver_detalles USING btree (usuario_id)`

---

## `favoritos`  (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| usuario_id | UUID | no | — |
| restaurante_id | UUID | no | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** usuario_id, restaurante_id

**Foreign keys:**
- `restaurante_id` → `restaurantes.id`
- `usuario_id` → `usuarios.id`

**Índices:**
- `favoritos_pkey`: `CREATE UNIQUE INDEX favoritos_pkey ON public.favoritos USING btree (usuario_id, restaurante_id)`

---

## `grupos_opciones`  (106 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| plato_id | UUID | no | — |
| titulo | VARCHAR(120) | no | — |
| requerido | BOOLEAN | no | false |
| minimo | INTEGER | no | 0 |
| maximo | INTEGER | no | 1 |
| orden | INTEGER | no | 0 |

**Primary key:** id

**Foreign keys:**
- `plato_id` → `platos.id`

**Índices:**
- `grupos_opciones_pkey`: `CREATE UNIQUE INDEX grupos_opciones_pkey ON public.grupos_opciones USING btree (id)`
- `idx_grupos_opciones_plato`: `CREATE INDEX idx_grupos_opciones_plato ON public.grupos_opciones USING btree (plato_id)`

---

## `horarios_atencion`  (49 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| restaurante_id | UUID | no | — |
| dia | VARCHAR(3) | no | — |
| hora_apertura | TIME WITHOUT TIME ZONE | sí | — |
| hora_cierre | TIME WITHOUT TIME ZONE | sí | — |

**Primary key:** id

**Foreign keys:**
- `restaurante_id` → `restaurantes.id`

**Unique:** restaurante_id, dia

**Índices:**
- `horarios_atencion_pkey`: `CREATE UNIQUE INDEX horarios_atencion_pkey ON public.horarios_atencion USING btree (id)`
- `horarios_atencion_restaurante_id_dia_key`: `CREATE UNIQUE INDEX horarios_atencion_restaurante_id_dia_key ON public.horarios_atencion USING btree (restaurante_id, dia)`

---

## `item_opciones`  (24 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| item_id | UUID | no | — |
| grupo_titulo_snapshot | VARCHAR(120) | no | — |
| choice_nombre_snapshot | VARCHAR(80) | no | — |
| precio_extra | NUMERIC(8,2) | no | 0 |

**Primary key:** id

**Foreign keys:**
- `item_id` → `pedido_items.id`

**Índices:**
- `item_opciones_pkey`: `CREATE UNIQUE INDEX item_opciones_pkey ON public.item_opciones USING btree (id)`
- `idx_item_opciones_item`: `CREATE INDEX idx_item_opciones_item ON public.item_opciones USING btree (item_id)`

---

## `notificaciones`  (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| usuario_id | UUID | no | — |
| sub_pedido_id | UUID | sí | — |
| tipo | VARCHAR(30) | no | — |
| titulo | VARCHAR(120) | no | — |
| mensaje | TEXT | no | — |
| leida | BOOLEAN | no | false |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `sub_pedido_id` → `sub_pedidos.id`
- `usuario_id` → `usuarios.id`

**Índices:**
- `notificaciones_pkey`: `CREATE UNIQUE INDEX notificaciones_pkey ON public.notificaciones USING btree (id)`
- `idx_notif_usuario`: `CREATE INDEX idx_notif_usuario ON public.notificaciones USING btree (usuario_id, creado_en DESC)`

---

## `opciones_choices`  (374 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| grupo_id | UUID | no | — |
| nombre | VARCHAR(80) | no | — |
| precio_extra | NUMERIC(8,2) | no | 0 |
| orden | INTEGER | no | 0 |

**Primary key:** id

**Foreign keys:**
- `grupo_id` → `grupos_opciones.id`

**Índices:**
- `opciones_choices_pkey`: `CREATE UNIQUE INDEX opciones_choices_pkey ON public.opciones_choices USING btree (id)`
- `idx_opciones_choices_grupo`: `CREATE INDEX idx_opciones_choices_grupo ON public.opciones_choices USING btree (grupo_id)`

---

## `otp_codes`  (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| celular | VARCHAR(9) | no | — |
| codigo | VARCHAR(6) | no | — |
| expira_en | TIMESTAMP WITH TIME ZONE | no | — |
| usado | BOOLEAN | no | false |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Índices:**
- `otp_codes_pkey`: `CREATE UNIQUE INDEX otp_codes_pkey ON public.otp_codes USING btree (id)`
- `idx_otp_celular`: `CREATE INDEX idx_otp_celular ON public.otp_codes USING btree (celular)`

---

## `pedido_estado_historial`  (229 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| sub_pedido_id | UUID | no | — |
| estado | VARCHAR(20) | no | — |
| cambiado_por | UUID | sí | — |
| notas | TEXT | sí | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `cambiado_por` → `usuarios.id`
- `sub_pedido_id` → `sub_pedidos.id`

**Índices:**
- `pedido_estado_historial_pkey`: `CREATE UNIQUE INDEX pedido_estado_historial_pkey ON public.pedido_estado_historial USING btree (id)`
- `idx_historial_subpedido`: `CREATE INDEX idx_historial_subpedido ON public.pedido_estado_historial USING btree (sub_pedido_id)`

---

## `pedido_items`  (166 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| sub_pedido_id | UUID | no | — |
| plato_id | UUID | sí | — |
| nombre_snapshot | VARCHAR(120) | no | — |
| precio_snapshot | NUMERIC(8,2) | no | — |
| cantidad | INTEGER | no | — |
| subtotal | NUMERIC(10,2) | no | — |
| notas | TEXT | sí | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `plato_id` → `platos.id`
- `sub_pedido_id` → `sub_pedidos.id`

**Índices:**
- `pedido_items_pkey`: `CREATE UNIQUE INDEX pedido_items_pkey ON public.pedido_items USING btree (id)`
- `idx_items_subpedido`: `CREATE INDEX idx_items_subpedido ON public.pedido_items USING btree (sub_pedido_id)`

---

## `pedidos`  (70 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| codigo | VARCHAR(20) | no | — |
| usuario_id | UUID | no | — |
| subtotal | NUMERIC(10,2) | no | 0 |
| total_envio | NUMERIC(10,2) | no | 0 |
| propina | NUMERIC(10,2) | no | 0 |
| vip | BOOLEAN | no | false |
| costo_vip | NUMERIC(10,2) | no | 0 |
| total | NUMERIC(10,2) | no | 0 |
| notas | TEXT | sí | — |
| estado_global | VARCHAR(20) | no | 'PENDIENTE'::character varying |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `usuario_id` → `usuarios.id`

**Unique:** codigo

**Índices:**
- `pedidos_codigo_key`: `CREATE UNIQUE INDEX pedidos_codigo_key ON public.pedidos USING btree (codigo)`
- `pedidos_pkey`: `CREATE UNIQUE INDEX pedidos_pkey ON public.pedidos USING btree (id)`
- `idx_pedidos_creado`: `CREATE INDEX idx_pedidos_creado ON public.pedidos USING btree (creado_en DESC)`
- `idx_pedidos_usuario`: `CREATE INDEX idx_pedidos_usuario ON public.pedidos USING btree (usuario_id)`

---

## `platos`  (119 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| restaurante_id | UUID | no | — |
| subcategoria_id | UUID | sí | — |
| nombre | VARCHAR(120) | no | — |
| descripcion | TEXT | sí | — |
| precio | NUMERIC(8,2) | no | — |
| imagen_url | TEXT | sí | — |
| tiempo_estimado | INTEGER | sí | — |
| disponible | BOOLEAN | no | true |
| orden | INTEGER | no | 0 |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `restaurante_id` → `restaurantes.id`
- `subcategoria_id` → `subcategorias.id`

**Índices:**
- `platos_pkey`: `CREATE UNIQUE INDEX platos_pkey ON public.platos USING btree (id)`
- `idx_platos_restaurante`: `CREATE INDEX idx_platos_restaurante ON public.platos USING btree (restaurante_id)`
- `idx_platos_subcategoria`: `CREATE INDEX idx_platos_subcategoria ON public.platos USING btree (subcategoria_id)`

---

## `promociones`  (3 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| badge | VARCHAR(40) | sí | — |
| titulo | VARCHAR(80) | no | — |
| subtitulo | VARCHAR(120) | sí | — |
| descripcion | TEXT | sí | — |
| cta_texto | VARCHAR(40) | sí | — |
| imagen_url | TEXT | sí | — |
| gradiente_css | VARCHAR(160) | sí | — |
| orden | INTEGER | no | 0 |
| activo | BOOLEAN | no | true |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| link_url | TEXT | sí | — |

**Primary key:** id

**Índices:**
- `promociones_pkey`: `CREATE UNIQUE INDEX promociones_pkey ON public.promociones USING btree (id)`
- `idx_promociones_activo`: `CREATE INDEX idx_promociones_activo ON public.promociones USING btree (activo, orden)`

---

## `push_subscriptions`  (7 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| usuario_id | UUID | no | — |
| token | TEXT | no | — |
| user_agent | TEXT | sí | — |
| activo | BOOLEAN | no | true |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `usuario_id` → `usuarios.id`

**Unique:** token

**Índices:**
- `push_subscriptions_pkey`: `CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id)`
- `push_subscriptions_token_key`: `CREATE UNIQUE INDEX push_subscriptions_token_key ON public.push_subscriptions USING btree (token)`
- `idx_push_subs_usuario`: `CREATE INDEX idx_push_subs_usuario ON public.push_subscriptions USING btree (usuario_id, activo)`

---

## `push_tokens`  (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| usuario_id | UUID | no | — |
| token | TEXT | no | — |
| plataforma | VARCHAR(20) | no | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `usuario_id` → `usuarios.id`

**Unique:** token

**Índices:**
- `push_tokens_pkey`: `CREATE UNIQUE INDEX push_tokens_pkey ON public.push_tokens USING btree (id)`
- `push_tokens_token_key`: `CREATE UNIQUE INDEX push_tokens_token_key ON public.push_tokens USING btree (token)`
- `idx_push_tokens_usuario`: `CREATE INDEX idx_push_tokens_usuario ON public.push_tokens USING btree (usuario_id)`

---

## `restaurantes`  (7 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| usuario_id | UUID | sí | — |
| slug | VARCHAR(60) | no | — |
| nombre | VARCHAR(120) | no | — |
| subtitulo | VARCHAR(160) | sí | — |
| direccion_fisica | TEXT | sí | — |
| referencia | TEXT | sí | — |
| lat | NUMERIC(9,6) | sí | — |
| lng | NUMERIC(9,6) | sí | — |
| celular | VARCHAR(9) | sí | — |
| logo_url | TEXT | sí | — |
| banner_url | TEXT | sí | — |
| tiempo_estimado | VARCHAR(20) | sí | — |
| monto_minimo | NUMERIC(8,2) | no | 5.00 |
| calificacion | NUMERIC(2,1) | no | 0 |
| num_resenas | INTEGER | no | 0 |
| activo | BOOLEAN | no | true |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| costo_envio_minimo | NUMERIC(6,2) | sí | NULL::numeric |

**Primary key:** id

**Foreign keys:**
- `usuario_id` → `usuarios.id`

**Unique:** slug, usuario_id

**Índices:**
- `restaurantes_pkey`: `CREATE UNIQUE INDEX restaurantes_pkey ON public.restaurantes USING btree (id)`
- `restaurantes_slug_key`: `CREATE UNIQUE INDEX restaurantes_slug_key ON public.restaurantes USING btree (slug)`
- `restaurantes_usuario_id_key`: `CREATE UNIQUE INDEX restaurantes_usuario_id_key ON public.restaurantes USING btree (usuario_id)`

---

## `restaurantes_categorias`  (12 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| restaurante_id | UUID | no | — |
| categoria_id | UUID | no | — |

**Primary key:** restaurante_id, categoria_id

**Foreign keys:**
- `categoria_id` → `categorias.id`
- `restaurante_id` → `restaurantes.id`

**Índices:**
- `restaurantes_categorias_pkey`: `CREATE UNIQUE INDEX restaurantes_categorias_pkey ON public.restaurantes_categorias USING btree (restaurante_id, categoria_id)`

---

## `rutas_cache`  (80 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| restaurante_lat | NUMERIC(9,6) | no | — |
| restaurante_lng | NUMERIC(9,6) | no | — |
| cliente_lat | NUMERIC(9,6) | no | — |
| cliente_lng | NUMERIC(9,6) | no | — |
| distancia_km | NUMERIC(6,2) | no | — |
| duracion_min | INTEGER | sí | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Unique:** restaurante_lat, restaurante_lng, cliente_lat, cliente_lng

**Índices:**
- `rutas_cache_pkey`: `CREATE UNIQUE INDEX rutas_cache_pkey ON public.rutas_cache USING btree (id)`
- `rutas_cache_unique`: `CREATE UNIQUE INDEX rutas_cache_unique ON public.rutas_cache USING btree (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng)`
- `idx_rutas_cache_lookup`: `CREATE INDEX idx_rutas_cache_lookup ON public.rutas_cache USING btree (restaurante_lat, restaurante_lng, cliente_lat, cliente_lng)`

---

## `solicitudes_recuperacion`  (1 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| celular | VARCHAR(9) | no | — |
| usuario_id | UUID | sí | — |
| estado | VARCHAR(20) | no | 'PENDIENTE'::character varying |
| notas | TEXT | sí | — |
| atendido_por | UUID | sí | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| atendido_en | TIMESTAMP WITH TIME ZONE | sí | — |

**Primary key:** id

**Foreign keys:**
- `atendido_por` → `usuarios.id`
- `usuario_id` → `usuarios.id`

**Índices:**
- `solicitudes_recuperacion_pkey`: `CREATE UNIQUE INDEX solicitudes_recuperacion_pkey ON public.solicitudes_recuperacion USING btree (id)`
- `idx_solicitudes_celular`: `CREATE INDEX idx_solicitudes_celular ON public.solicitudes_recuperacion USING btree (celular)`
- `idx_solicitudes_estado`: `CREATE INDEX idx_solicitudes_estado ON public.solicitudes_recuperacion USING btree (estado, creado_en DESC)`

---

## `sub_pedidos`  (84 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| pedido_id | UUID | no | — |
| restaurante_id | UUID | no | — |
| driver_id | UUID | sí | — |
| estado | VARCHAR(20) | no | 'PENDIENTE'::character varying |
| subtotal | NUMERIC(10,2) | no | 0 |
| costo_envio | NUMERIC(10,2) | no | 0 |
| distancia_km | NUMERIC(6,2) | sí | — |
| tiempo_estimado | INTEGER | sí | — |
| direccion_snapshot | JSONB | sí | — |
| notas | TEXT | sí | — |
| motivo_rechazo | TEXT | sí | — |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| aceptado_en | TIMESTAMP WITH TIME ZONE | sí | — |
| listo_en | TIMESTAMP WITH TIME ZONE | sí | — |
| recogido_en | TIMESTAMP WITH TIME ZONE | sí | — |
| entregado_en | TIMESTAMP WITH TIME ZONE | sí | — |
| se_quedo_propina | BOOLEAN | sí | false |
| propina_vip_monto | NUMERIC(8,2) | sí | 0 |
| local_comision_regla_id | UUID | sí | — |
| local_comision_modalidad | VARCHAR(12) | sí | — |
| local_comision_valor | NUMERIC(10,4) | sí | — |
| local_comision_monto | NUMERIC(10,2) | sí | — |
| driver_comision_regla_id | UUID | sí | — |
| driver_comision_valor | NUMERIC(10,4) | sí | — |
| driver_comision_monto | NUMERIC(10,2) | sí | — |
| entrega_reportada_en | TIMESTAMP WITH TIME ZONE | sí | — |
| cliente_confirmo_en | TIMESTAMP WITH TIME ZONE | sí | — |
| driver_asignado_en | TIMESTAMP WITH TIME ZONE | sí | — |
| driver_llego_en | TIMESTAMP WITH TIME ZONE | sí | — |
| entrega_cerrada_admin_en | TIMESTAMP WITH TIME ZONE | sí | — |
| entrega_cerrada_local_en | TIMESTAMP WITH TIME ZONE | sí | — |
| tipo_pedido | VARCHAR(12) | no | 'NORMAL'::character varying |

**Primary key:** id

**Foreign keys:**
- `driver_id` → `usuarios.id`
- `pedido_id` → `pedidos.id`
- `restaurante_id` → `restaurantes.id`
- `local_comision_regla_id` → `comision_reglas.id`
- `driver_comision_regla_id` → `comision_reglas.id`

**Índices:**
- `sub_pedidos_pkey`: `CREATE UNIQUE INDEX sub_pedidos_pkey ON public.sub_pedidos USING btree (id)`
- `idx_subpedidos_driver`: `CREATE INDEX idx_subpedidos_driver ON public.sub_pedidos USING btree (driver_id, estado)`
- `idx_subpedidos_pedido`: `CREATE INDEX idx_subpedidos_pedido ON public.sub_pedidos USING btree (pedido_id)`
- `idx_subpedidos_rest`: `CREATE INDEX idx_subpedidos_rest ON public.sub_pedidos USING btree (restaurante_id, estado)`
- `idx_subpedidos_confirmacion_cliente`: `CREATE INDEX idx_subpedidos_confirmacion_cliente ON public.sub_pedidos USING btree (pedido_id, estado) WHERE ((estado)::text = 'ENTREGA_PENDIENTE_CONFIRMACION'::text)`

---

## `subcategorias`  (47 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| restaurante_id | UUID | no | — |
| nombre | VARCHAR(80) | no | — |
| orden | INTEGER | no | 0 |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |

**Primary key:** id

**Foreign keys:**
- `restaurante_id` → `restaurantes.id`

**Índices:**
- `subcategorias_pkey`: `CREATE UNIQUE INDEX subcategorias_pkey ON public.subcategorias USING btree (id)`
- `idx_subcategorias_rest`: `CREATE INDEX idx_subcategorias_rest ON public.subcategorias USING btree (restaurante_id)`

---

## `usuarios`  (48 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | UUID | no | gen_random_uuid() |
| role | VARCHAR(20) | no | 'CUSTOMER'::character varying |
| email | VARCHAR(255) | sí | — |
| celular | VARCHAR(9) | sí | — |
| password_hash | VARCHAR(255) | sí | — |
| nombre | VARCHAR(120) | no | — |
| avatar_url | TEXT | sí | — |
| activo | BOOLEAN | no | true |
| creado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| actualizado_en | TIMESTAMP WITH TIME ZONE | no | now() |
| restaurante_id | UUID | sí | — |

**Primary key:** id

**Foreign keys:**
- `restaurante_id` → `restaurantes.id`

**Unique:** celular, email

**Índices:**
- `usuarios_celular_key`: `CREATE UNIQUE INDEX usuarios_celular_key ON public.usuarios USING btree (celular)`
- `usuarios_email_key`: `CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email)`
- `usuarios_pkey`: `CREATE UNIQUE INDEX usuarios_pkey ON public.usuarios USING btree (id)`
- `idx_usuarios_celular`: `CREATE INDEX idx_usuarios_celular ON public.usuarios USING btree (celular)`
- `idx_usuarios_role`: `CREATE INDEX idx_usuarios_role ON public.usuarios USING btree (role)`
- `idx_usuarios_restaurante`: `CREATE INDEX idx_usuarios_restaurante ON public.usuarios USING btree (restaurante_id)`

---


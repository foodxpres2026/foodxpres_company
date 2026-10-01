# SQL de FoodXpres

Estos archivos son referencias y cambios versionados del esquema. La base Neon del proyecto ya contiene datos y se considera existente: no ejecutes estos archivos como inicialización ni los apliques automáticamente.

- `001_initial_schema.sql`: esquema inicial histórico.
- `002_local_orders_and_driver_timeline.sql`: cambio histórico para pedidos de locales y eventos de entrega; se conserva como referencia.
- `003_comisiones_confirmacion_y_pagos.sql`: comisiones con snapshot por pedido, confirmación de entrega y registro de pagos.
- `004_delivery_tariff_table.sql`: selección de una de las dos tablas de delivery FoodXpres.
- `005_driver_overdue_commission_block.sql`: impide tomar pedidos con comisión pendiente vencida por 48 horas.
- `006_comision_local_autopedidos.sql`: separa comisiones de locales para pedidos normales y autopedidos preferenciales; copia la última tasa normal como tasa inicial de autopedido sin recalcular snapshots ni deudas existentes.

La fotografía actual del esquema está en `backend/database/schema/`. Para cualquier cambio futuro, comparar primero esa estructura real, preparar un cambio incremental revisable y respaldar Neon antes de aplicar nada.

Las migraciones `005` y `006` están versionadas, pero no se ejecutan desde la aplicación. Aplicarlas en Neon de producción y en los demás entornos tras revisar el esquema y respaldar la base. Como los pagos se almacenan agregados y no se asignan a una comisión individual, se consideran aplicados primero a la deuda más antigua (FIFO). Después de registrar el pago desde Admin, el driver puede actualizar la pantalla para consultar su estado.

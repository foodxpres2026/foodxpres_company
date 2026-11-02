# SQL de FoodXpres

Estos archivos son referencias y cambios versionados del esquema. La base Neon del proyecto ya contiene datos y se considera existente: no ejecutes estos archivos como inicialización ni los apliques automáticamente.

- `001_initial_schema.sql`: esquema inicial histórico.
- `002_local_orders_and_driver_timeline.sql`: cambio histórico para pedidos de locales y eventos de entrega; se conserva como referencia.
- `003_comisiones_confirmacion_y_pagos.sql`: comisiones con snapshot por pedido, confirmación de entrega y registro de pagos.
- `004_delivery_tariff_table.sql`: selección de una de las dos tablas de delivery FoodXpres.
- `005_driver_overdue_commission_block.sql`: impide tomar pedidos con comisión pendiente vencida por 48 horas.
- `006_comision_local_autopedidos.sql`: separa comisiones de locales para pedidos normales y autopedidos preferenciales; copia la última tasa normal como tasa inicial de autopedido sin recalcular snapshots ni deudas existentes.
- `007_driver_completes_delivery.sql`: permite que el driver finalice la entrega y registre las comisiones; el acuse posterior del cliente/local es opcional e idempotente.
- `009_customer_login_attempt_limits.sql`: agrega buckets compartidos para limitar intentos fallidos de inicio de sesión de clientes por cuenta e IP.
- `010_pedido_metodo_pago.sql`: agrega método de pago y monto en efectivo para nuevos pedidos.

La fotografía actual del esquema está en `backend/database/schema/`. Para cualquier cambio futuro, comparar primero esa estructura real, preparar un cambio incremental revisable y respaldar Neon antes de aplicar nada.

La migración `009` debe aplicarse en Neon antes de desplegar el límite de intentos de inicio de sesión de clientes. No cambia usuarios ni hashes de contraseña.

La migración `010` debe aplicarse en Neon antes de desplegar la confirmación de método de pago. Los pedidos históricos quedan con el método `EFECTIVO`; `paga_con` permanece vacío porque no se conoce el monto que se entregó.

Las migraciones `005`, `006` y `007` están versionadas, pero no se ejecutan desde la aplicación. Aplicarlas en Neon de producción y en los demás entornos tras revisar el esquema y respaldar la base. La migración `007` debe aplicarse antes de desplegar el Driver actualizado, porque su API invoca la función de finalización con el modo `DRIVER`. Como los pagos se almacenan agregados y no se asignan a una comisión individual, se consideran aplicados primero a la deuda más antigua (FIFO). Después de registrar el pago desde Admin, el driver puede actualizar la pantalla para consultar su estado.

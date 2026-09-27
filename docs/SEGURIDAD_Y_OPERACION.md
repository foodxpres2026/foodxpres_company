# Seguridad y operación de FoodXpres

## Estado del repositorio

Este workspace mantiene `web-clientes` y `web-admin`. Las apps Flutter y la web de locales se retiraron; scripts/workflows que dependían de esas carpetas no forman parte del flujo actual.

### Controles aplicados en código

- Sesiones de cliente y administrador firmadas con HMAC y audiencias distintas, con vencimiento verificado en el servidor y sesiones atadas a `usuarios.actualizado_en`.
- Cada lectura de sesión vuelve a comprobar en Neon que la cuenta existe, está activa y conserva el rol esperado. Cerrar sesión invalida las sesiones abiertas de esa cuenta; cambiar contraseña invalida las otras sesiones.
- Cookies `HttpOnly`, `SameSite=Lax`, `Secure` en producción. Las sesiones emitidas antes de este cambio deberán iniciar sesión otra vez.
- Health checks responden con estado genérico y ya no exponen nombre, tablas, marcas de tiempo ni errores de Neon.
- El login de administración valida entradas. El alta y cambio de contraseña de cliente exigen 12 caracteres y respetan el máximo de 72 bytes efectivo de bcrypt; los usuarios actuales todavía pueden iniciar sesión con su contraseña anterior.
- La carga de imágenes requiere sesión administrativa, límite reducido, carpeta permitida y verificación de firma binaria del formato; no confía solo en el MIME del navegador.
- Las webs envían encabezados de endurecimiento; HSTS se activa solo en producción.
- El registro de errores del cálculo de envíos ya no escribe coordenadas del cliente en la consola del navegador.

## Pasos manuales antes de producción

1. **Rotar credenciales expuestas previamente** en sus paneles de Neon, Vercel, Cloudinary y OpenRouteService; después actualizar `.env.local` y las Environment Variables de Vercel. No volver a pegar secretos en chats, capturas o Git. La rotación no puede hacerse desde este repositorio.
2. **Aplicar límites en Vercel Firewall/WAF** para login de admin, login/registro/recuperación de clientes y APIs de escritura. El código no finge una protección por proceso que no sería compartida entre funciones serverless. Configura límites de solicitudes, respuesta y observación según el volumen real del negocio; verifica la disponibilidad del WAF en el plan de la cuenta.
3. **Publicar los textos y flujos legales reales**: privacidad, cookies/consentimiento, términos, devoluciones/reembolsos, datos del negocio y contacto. Faltan datos del titular, contacto, conservación de datos, medios de pago y políticas comerciales, así que estos textos no se inventan aquí.
4. **Verificar Firebase**: restringir las claves de navegador por origen/API cuando el producto Firebase lo permita, reglas de acceso y dominios autorizados. Las claves `NEXT_PUBLIC_*` son visibles al navegador; no guardar credenciales de cuenta de servicio allí.
5. **Validar respaldo y restauración Neon**, roles con privilegios mínimos, alertas y retención. No ejecutar `backend/sql/001_initial_schema.sql` ni scripts archivados sobre la BD existente; no se ha ejecutado ninguna migración.
6. **Completar revisión operativa** de accesibilidad por teclado, privacidad/consentimiento de notificaciones, restauración de contraseña por canal verificado y flujos de pago antes de habilitar tráfico real.

## Base y scripts

- `backend/database/schema/`: estructura documentada y SQL de referencia sin datos de usuarios.
- `backend/database/private-data/`: exportación existente con datos reales; está excluida de Git. Trátala como respaldo confidencial y limita su acceso local.
- `backend/database/backups/`: salida de exportación de respaldo; excluida de Git.
- `backend/scripts/`: utilidades de exportación, seeds y mantenimiento. Los seeds son para desarrollo/pruebas; confirmar el `DATABASE_URL` antes de ejecutar cualquier script.
- `backend/scripts/archive/borrar.sql`: SQL destructivo antiguo, aislado del flujo normal. No ejecutarlo sobre producción.

Exportar toda la base puede crear una copia nueva de información personal. Guarda esa copia de forma segura y elimínala cuando ya no sea necesaria.

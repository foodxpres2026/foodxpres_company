# FoodXpres Drivers

Aplicación Flutter independiente. Por ahora incluye inicio y cierre de sesión, usando `POST /api/mobile/auth/login` del backend móvil.

## Probar en Chrome

Desde la raíz del repositorio:

```bash
pnpm install
pnpm dev:mobile-api
```

En otra terminal:

```bash
pnpm dev:app-driver
```

La app usa `http://localhost:3100` y abre Chrome en el puerto `5556`. Configura `apps/mobile-api/.env.local` siguiendo su `.env.example` antes de probar credenciales reales.

Para probar desde un emulador Android, usa `--dart-define=API_BASE_URL=http://10.0.2.2:3100`. Para compilar un APK de producción, define la URL HTTPS pública del backend móvil.

La firma de publicación del APK todavía debe configurarse antes de distribuirlo; la configuración de desarrollo no es una firma de publicación.

# FoodXpres Mobile API

API independiente para el inicio de sesión de las aplicaciones Flutter de locales y drivers. Consulta la base Neon existente; no crea tablas ni ejecuta migraciones.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y completa `DATABASE_URL` con la conexión Neon y `MOBILE_AUTH_SECRET` con un secreto aleatorio de al menos 32 bytes. No copies estos valores a Flutter.
2. Desde la raíz del monorepo ejecuta `pnpm install` y `pnpm dev:mobile-api`.
3. Comprueba `http://localhost:3100/api/health`.

El endpoint `POST /api/mobile/auth/login` acepta `{ "kind": "local", "email": "...", "password": "..." }` o `{ "kind": "driver", "celular": "9XXXXXXXX", "password": "..." }`. Ambos usan los hashes bcrypt existentes de `usuarios` y devuelven un token firmado solo para móvil.

## Despliegue

Crear un proyecto Vercel independiente apuntando al mismo repositorio, con **Root Directory** `apps/mobile-api`. Configurar `DATABASE_URL`, `MOBILE_AUTH_SECRET` y `MOBILE_ALLOWED_ORIGINS` en el proyecto de Vercel. La base de datos es la existente; no correr scripts SQL.

`MOBILE_ALLOWED_ORIGINS` debe tener los orígenes de la app Flutter Web desplegada, separados por coma. CORS no es una barrera de autenticación; las apps nativas no dependen de CORS.

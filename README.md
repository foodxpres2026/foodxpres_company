# 🐯 FoodXpres

Sistema de delivery para Pucallpa, Perú.

## 📦 Estructura

| App | Descripción | Stack |
|---|---|---|
| `apps/web-clientes` | Web para clientes | Next.js |
| `apps/web-admin` | Dashboard de administración | Next.js |
| `apps/app-local` | App para restaurantes | Flutter |
| `apps/app-driver` | App para repartidores | Flutter |

## 📚 Paquetes compartidos

- `@foodxpres/types` — Tipos TypeScript
- `@foodxpres/utils` — Funciones helper
- `@foodxpres/api-client` — Cliente HTTP
- `@foodxpres/ui` — Componentes compartidos
- `@foodxpres/config` — Configuraciones

## 🚀 Comandos

```bash
pnpm install       # Instalar dependencias
pnpm dev:admin     # Correr web-admin
pnpm dev:clientes  # Correr web-clientes
pnpm build         # Build de producción
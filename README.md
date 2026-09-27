# FoodXpres

Plataforma de pedidos y delivery para Pucallpa, Perú.

## Aplicaciones activas en este repositorio

| App | Función | Puerto local |
|---|---|---:|
| `apps/web-clientes` | Tienda y cuenta del cliente | 3000 |
| `apps/web-admin` | Administración, operación de pedidos y APIs | 3001 |

Las aplicaciones de locales y Flutter se retiraron del workspace actual. Sus respaldos locales son independientes de este repositorio.

## Desarrollo

```bash
pnpm install
pnpm dev:clientes
pnpm dev:admin
```

Ejecuta cada web en su propia terminal. `pnpm dev` puede iniciar las dos mediante Turborepo. Configura variables privadas en el `.env.local` correspondiente a cada app; no compartas ni subas estos archivos.

## Base de datos y scripts

- `backend/sql/`: scripts SQL versionados. No ejecutar migraciones sobre la base Neon de producción sin una revisión aparte.
- `backend/database/schema/`: documentación y estructura sin filas de clientes.
- `backend/database/private-data/`: exportaciones reales; ignoradas por Git porque pueden incluir datos personales y hashes de contraseñas.
- `backend/database/backups/`: copias de datos exportadas; ignoradas por Git.
- `backend/scripts/`: utilidades de exportación, carga de datos y mantenimiento. Revisa cada script antes de apuntarlo a producción.
- `backend/scripts/archive/borrar.sql`: operación destructiva archivada; no forma parte de las migraciones.

La arquitectura, las tareas manuales de seguridad y las dependencias de servicios están en [docs/SEGURIDAD_Y_OPERACION.md](docs/SEGURIDAD_Y_OPERACION.md).

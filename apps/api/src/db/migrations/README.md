# Migraciones Drizzle

Esta carpeta la gestiona **drizzle-kit**. No editar archivos a mano.

## Generar la migración inicial (Fase 3)

Tras instalar dependencias y con Postgres corriendo:

```bash
# Desde la raíz del monorepo
pnpm install
docker compose up -d db

# Generar la primera migración a partir del schema en src/db/schema/*
pnpm db:generate

# Esto creará:
#   src/db/migrations/0000_<random_name>.sql
#   src/db/migrations/meta/_journal.json
#   src/db/migrations/meta/0000_snapshot.json

# Aplicar
pnpm db:migrate
```

## Verificar el resultado

```bash
# Drizzle Studio para inspección visual
pnpm db:studio
```

Tablas esperadas tras la primera migración:

- `users`, `auth_sessions`
- `user_profile`, `profile_version`
- `daily_weight`, `daily_entry`, `exercise_log`
- `attribute_log`, `xp_log`
- `weeks`, `milestones`

Más enums: `sexo`, `factor_actividad`, `exercise_tipo`,
`atributo_codigo`, `xp_tipo`, `estado_semana`.

## ¿Por qué no hay SQL pre-generado en este commit?

`drizzle-kit generate` produce además los archivos en `meta/` que son
necesarios para que `drizzle-orm/node-postgres/migrator` aplique las
migraciones de forma idempotente. Esos archivos se generan con la
toolchain instalada, no a mano.

Cuando ejecutes `pnpm db:generate` los archivos aparecerán aquí. Una
vez generados, se commitean al repo.

/* eslint-disable no-console */
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/**
 * Resuelve la carpeta de migraciones de forma robusta tanto en dev
 * (`tsx src/db/migrate.ts`) como en runtime compilado
 * (`node apps/api/dist/db/migrate.js` dentro del container Docker).
 *
 * El Dockerfile copia `src/db/migrations/` a `dist/db/migrations/`
 * para que `path.resolve(__dirname, 'migrations')` funcione en ambos
 * casos. `__dirname` está disponible en CommonJS (config de NestJS).
 *
 *   - dev:  apps/api/src/db/migrate.ts → apps/api/src/db/migrations
 *   - prod: apps/api/dist/db/migrate.js → apps/api/dist/db/migrations
 */
function resolveMigrationsFolder(): string {
  return resolve(__dirname, 'migrations');
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está definida');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle(pool);

  const migrationsFolder = resolveMigrationsFolder();
  console.log(`Ejecutando migraciones desde ${migrationsFolder}…`);
  await migrate(db, { migrationsFolder });
  console.log('Migraciones aplicadas.');

  await pool.end();
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});

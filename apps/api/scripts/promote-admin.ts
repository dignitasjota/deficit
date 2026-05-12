/**
 * Promueve un usuario a admin por email. Idempotente: si ya es admin,
 * confirma y termina.
 *
 * Uso:
 *   pnpm --filter @perdida-peso/api admin:promote <email>
 *
 * Ejecuta directamente Drizzle contra la BBDD (no pasa por la API).
 * Pensado para bootstrap del primer admin: una vez tienes uno, el
 * resto se gestionan desde el panel.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '../src/db/schema/users.js';

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Uso: tsx scripts/promote-admin.ts <email>');
    process.exit(1);
  }
  if (!/.+@.+\..+/.test(email)) {
    console.error(`Email inválido: ${email}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL no está definido en el entorno.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existing) {
      console.error(`Usuario no encontrado: ${email}`);
      process.exit(2);
    }

    if (existing.role === 'admin') {
      console.log(`✓ ${email} ya es admin (${existing.id}). Sin cambios.`);
      return;
    }

    await db
      .update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    console.log(`✓ ${email} promovido a admin (${existing.id}).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error promoviendo admin:', err);
  process.exit(1);
});

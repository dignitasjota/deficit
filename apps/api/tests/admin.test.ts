/**
 * Tests integración del panel admin (Fase 15):
 *   - AdminGuard rechaza non-admin
 *   - Métricas, lista, detail
 *   - Suspend/restore con login bloqueado
 *   - Impersonate genera tokens del target + audit
 *   - Audit listing
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DATABASE, type Database } from '../src/db/database.module.js';
import { users } from '../src/db/schema/users.js';

interface RegisteredUser {
  email: string;
  accessToken: string;
  password: string;
  id: string;
}

async function register(
  app: INestApplication,
  suffix: string,
): Promise<RegisteredUser> {
  const email = `admin-${suffix}-${Date.now()}@test.local`;
  const password = 'TestPassword123!';
  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  const accessToken = reg.body.accessToken as string;

  const me = await request(app.getHttpServer())
    .get('/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return { email, accessToken, password, id: me.body.id as string };
}

describe('Admin (Fase 15)', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    db = app.get<Database>(DATABASE);
  });

  afterAll(async () => {
    await app.close();
  });

  async function makeAdmin(user: RegisteredUser): Promise<void> {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));
  }

  it('non-admin → 403', async () => {
    const u = await register(app, 'non-admin');
    await request(app.getHttpServer())
      .get('/v1/admin/metrics')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(403);
  });

  it('admin obtiene métricas', async () => {
    const a = await register(app, 'admin-metrics');
    await makeAdmin(a);
    const res = await request(app.getHttpServer())
      .get('/v1/admin/metrics')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(res.body.totalUsers).toBeGreaterThan(0);
    expect(res.body.mrrCents).toBe(0);
  });

  it('admin lista usuarios con búsqueda por email', async () => {
    const a = await register(app, 'admin-list');
    await makeAdmin(a);
    const target = await register(app, 'list-target');

    const res = await request(app.getHttpServer())
      .get(`/v1/admin/users?q=list-target`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    const found = res.body.users.find((u: { email: string }) => u.email === target.email);
    expect(found).toBeDefined();
  });

  it('admin obtiene detalle de un usuario', async () => {
    const a = await register(app, 'admin-detail');
    await makeAdmin(a);
    const target = await register(app, 'detail-target');

    const res = await request(app.getHttpServer())
      .get(`/v1/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(target.id);
    expect(res.body.totalSessions).toBeGreaterThanOrEqual(1);
  });

  it('admin suspende y restaura, login bloqueado durante suspensión', async () => {
    const a = await register(app, 'admin-suspend');
    await makeAdmin(a);
    const target = await register(app, 'suspend-target');

    await request(app.getHttpServer())
      .post(`/v1/admin/users/${target.id}/suspend`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ motivo: 'test' })
      .expect(200);

    // Login del target → 401 (cuenta suspendida).
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: target.email, password: target.password })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/v1/admin/users/${target.id}/restore`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(204);

    // Tras restore, login funciona.
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: target.email, password: target.password })
      .expect(200);
  });

  it('impersonate genera tokens del target y audita', async () => {
    const a = await register(app, 'admin-impersonate');
    await makeAdmin(a);
    const target = await register(app, 'imp-target');

    const res = await request(app.getHttpServer())
      .post(`/v1/admin/users/${target.id}/impersonate`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send()
      .expect(200);
    expect(res.body.targetUserId).toBe(target.id);
    expect(res.body.targetEmail).toBe(target.email);

    // El access token impersonado da acceso como el target.
    const meAsTarget = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(meAsTarget.body.id).toBe(target.id);
    expect(meAsTarget.body.email).toBe(target.email);

    // El audit log refleja la acción.
    const audit = await request(app.getHttpServer())
      .get('/v1/admin/audit')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    const found = audit.body.entries.find(
      (e: { action: string; targetUserId: string }) =>
        e.action === 'impersonate_user' && e.targetUserId === target.id,
    );
    expect(found).toBeDefined();
    expect(found.adminEmail).toBe(a.email);
  });

  it('no se puede impersonar a otro admin', async () => {
    const a1 = await register(app, 'admin-vs-admin-1');
    await makeAdmin(a1);
    const a2 = await register(app, 'admin-vs-admin-2');
    await makeAdmin(a2);
    await request(app.getHttpServer())
      .post(`/v1/admin/users/${a2.id}/impersonate`)
      .set('Authorization', `Bearer ${a1.accessToken}`)
      .send()
      .expect(403);
  });

  it('no se puede suspender a uno mismo', async () => {
    const a = await register(app, 'admin-self-suspend');
    await makeAdmin(a);
    await request(app.getHttpServer())
      .post(`/v1/admin/users/${a.id}/suspend`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({})
      .expect(400);
  });
});

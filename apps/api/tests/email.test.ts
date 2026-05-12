/**
 * Tests integración del flujo de email transaccional (Fase 14):
 *   - Verificación de email
 *   - Password reset
 *   - Soft-delete + cron purga
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * El MailerService se "mockea" inyectando un sink en memoria. No hay
 * SMTP real involucrado.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PurgeService } from '../src/auth/purge.service.js';
import { DATABASE, type Database } from '../src/db/database.module.js';
import { users } from '../src/db/schema/users.js';
import { MailerService, type MailMessage } from '../src/mailer/mailer.service.js';

interface RegisteredUser {
  email: string;
  accessToken: string;
  password: string;
}

async function register(
  app: INestApplication,
  suffix: string,
): Promise<RegisteredUser> {
  const email = `mail-${suffix}-${Date.now()}@test.local`;
  const password = 'TestPassword123!';
  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  return { email, accessToken: reg.body.accessToken as string, password };
}

function extractToken(msg: MailMessage): string {
  const m = msg.html.match(/token=([A-Za-z0-9_-]+)/);
  if (!m || !m[1]) throw new Error(`No se encontró token en email: ${msg.subject}`);
  return decodeURIComponent(m[1]);
}

describe('Email transaccional (Fase 14)', () => {
  let app: INestApplication;
  let sink: MailMessage[];
  let db: Database;
  let purge: PurgeService;

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

    sink = [];
    app.get(MailerService).setMockSink(sink);
    db = app.get<Database>(DATABASE);
    purge = app.get(PurgeService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    sink.length = 0;
  });

  describe('Verificación de email', () => {
    it('register dispara email de verificación', async () => {
      await register(app, 'verify-on-register');
      // El envío es async (void), damos un tick.
      await new Promise((r) => setTimeout(r, 50));
      const verify = sink.find((m) => m.subject.toLowerCase().includes('verifica'));
      expect(verify).toBeDefined();
      expect(verify?.html).toContain('token=');
    });

    it('verify-email con token válido marca emailVerifiedAt', async () => {
      const u = await register(app, 'verify-ok');
      await new Promise((r) => setTimeout(r, 50));
      const msg = sink.find((m) => m.to === u.email && m.subject.toLowerCase().includes('verifica'));
      const token = extractToken(msg!);

      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token })
        .expect(204);

      const me = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
      expect(me.body.emailVerifiedAt).not.toBeNull();
    });

    it('verify-email rechaza token inválido', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token: 'tokenfalsoperolosuficientementelargo123456' })
        .expect(400);
    });

    it('verify-email rechaza token ya usado (consumo único)', async () => {
      const u = await register(app, 'verify-twice');
      await new Promise((r) => setTimeout(r, 50));
      const msg = sink.find((m) => m.to === u.email && m.subject.toLowerCase().includes('verifica'));
      const token = extractToken(msg!);
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token })
        .expect(204);
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token })
        .expect(400);
    });

    it('resend-verification rechaza si ya está verificado', async () => {
      const u = await register(app, 'verify-resend');
      await new Promise((r) => setTimeout(r, 50));
      const msg = sink.find((m) => m.to === u.email);
      const token = extractToken(msg!);
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token })
        .expect(204);
      await request(app.getHttpServer())
        .post('/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(400);
    });
  });

  describe('Password reset', () => {
    it('request-password-reset envía email y reset-password cambia la contraseña', async () => {
      const u = await register(app, 'pwd-reset');
      await new Promise((r) => setTimeout(r, 50));
      sink.length = 0;

      await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email: u.email })
        .expect(204);
      await new Promise((r) => setTimeout(r, 50));

      const resetMsg = sink.find((m) => m.subject.toLowerCase().includes('contrase'));
      expect(resetMsg).toBeDefined();
      const token = extractToken(resetMsg!);

      const newPassword = 'OtraPassword456!';
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token, newPassword })
        .expect(204);

      // La password antigua ya no funciona.
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(401);

      // La nueva sí.
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: u.email, password: newPassword })
        .expect(200);
      expect(login.body.accessToken).toBeDefined();
    });

    it('request-password-reset devuelve 204 incluso si el email no existe', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email: `nonexistent-${Date.now()}@test.local` })
        .expect(204);
    });

    it('reset-password rechaza token inválido', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token: 'tokenfalsodelosgrandesssssssssssssssss123', newPassword: 'OtraPassword456!' })
        .expect(400);
    });
  });

  describe('Soft-delete y purga', () => {
    it('delete-account requiere la contraseña actual', async () => {
      const u = await register(app, 'del-pwd');
      await request(app.getHttpServer())
        .post('/v1/auth/delete-account')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ password: 'wrong-password-123' })
        .expect(401);
    });

    it('delete-account marca deleted_at + purge_scheduled_at y envía email', async () => {
      const u = await register(app, 'del-ok');
      await new Promise((r) => setTimeout(r, 50));
      sink.length = 0;

      const res = await request(app.getHttpServer())
        .post('/v1/auth/delete-account')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ password: u.password })
        .expect(200);

      expect(res.body.purgeScheduledAt).toBeDefined();
      const purgeDate = new Date(res.body.purgeScheduledAt);
      const diffDays = (purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);

      await new Promise((r) => setTimeout(r, 50));
      const deleteMsg = sink.find((m) => m.to === u.email);
      expect(deleteMsg).toBeDefined();
      expect(deleteMsg?.subject.toLowerCase()).toContain('eliminaci');

      // Login bloqueado: el usuario ya tiene deleted_at.
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: u.email, password: u.password })
        .expect(401);
    });

    it('cron purge elimina cuentas con purge_scheduled_at en el pasado', async () => {
      const u = await register(app, 'del-purge');
      await request(app.getHttpServer())
        .post('/v1/auth/delete-account')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ password: u.password })
        .expect(200);

      // Forzar purge_scheduled_at al pasado.
      await db
        .update(users)
        .set({ purgeScheduledAt: new Date(Date.now() - 1000) })
        .where(eq(users.email, u.email));

      const result = await purge.runNow();
      expect(result.purgedUsers).toBeGreaterThanOrEqual(1);

      // El usuario ya no existe.
      const found = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);
      expect(found).toHaveLength(0);
    });
  });
});

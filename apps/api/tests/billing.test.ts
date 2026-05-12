/**
 * Tests integración de billing y feature gating (Fase 17):
 *   - Trial 14d activo da effectivePlan = 'premium'
 *   - Trial expirado o plan free → 402 en endpoints premium
 *   - Plan premium en BBDD → acceso libre
 *   - GET /v1/billing/me coherente
 *   - Webhook rechaza sin secret / sin signature
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas. NO toca
 * Stripe API real: solo verifica el feature gating y el comportamiento
 * defensivo del webhook.
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
  id: string;
}

async function registerAndOnboard(
  app: INestApplication,
  suffix: string,
): Promise<RegisteredUser> {
  const email = `billing-${suffix}-${Date.now()}@test.local`;
  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password: 'TestPassword123!' });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  const accessToken = reg.body.accessToken as string;
  await request(app.getHttpServer())
    .put('/v1/users/me/profile')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      pesoInicialKg: 100,
      pesoObjetivoKg: 80,
      alturaCm: 175,
      edad: 30,
      sexo: 'M',
      factorActividad: 'moderado',
      fechaInicio: new Date().toISOString().slice(0, 10),
    })
    .expect(200);
  const me = await request(app.getHttpServer())
    .get('/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
  return { email, accessToken, id: me.body.id as string };
}

describe('Billing y feature gating (Fase 17)', () => {
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

  describe('Trial sin tarjeta', () => {
    it('register marca trial_ends_at = now + 14d y effectivePlan = premium', async () => {
      const u = await registerAndOnboard(app, 'trial-on-register');
      const me = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
      expect(me.body.plan).toBe('free');
      expect(me.body.trialEndsAt).not.toBeNull();
      expect(me.body.effectivePlan).toBe('premium');

      const trialEnd = new Date(me.body.trialEndsAt);
      const diffDays = (trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeGreaterThan(13.5);
      expect(diffDays).toBeLessThan(14.5);
    });

    it('GET /v1/billing/me refleja trial activo', async () => {
      const u = await registerAndOnboard(app, 'billing-state');
      const res = await request(app.getHttpServer())
        .get('/v1/billing/me')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
      expect(res.body.plan).toBe('free');
      expect(res.body.effectivePlan).toBe('premium');
      expect(res.body.trialActive).toBe(true);
      expect(res.body.trialDaysLeft).toBeGreaterThanOrEqual(13);
      expect(res.body.subscription).toBeNull();
    });
  });

  describe('@RequiresPlan(premium)', () => {
    it('trial activo permite acceso a endpoints premium', async () => {
      const u = await registerAndOnboard(app, 'premium-via-trial');
      // /v1/charts/weight es premium-gated.
      await request(app.getHttpServer())
        .get('/v1/charts/weight?range=30d')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
    });

    it('trial expirado + plan free → 402', async () => {
      const u = await registerAndOnboard(app, 'free-blocked');
      // Forzar trial al pasado.
      await db
        .update(users)
        .set({ trialEndsAt: new Date(Date.now() - 1000) })
        .where(eq(users.id, u.id));

      const res = await request(app.getHttpServer())
        .get('/v1/charts/weight?range=30d')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(402);
      expect(res.body.requiredPlan).toBe('premium');
      expect(res.body.currentPlan).toBe('free');
    });

    it('plan premium directo (post-suscripción) sin trial → acceso', async () => {
      const u = await registerAndOnboard(app, 'free-plus-premium');
      await db
        .update(users)
        .set({ plan: 'premium', trialEndsAt: null })
        .where(eq(users.id, u.id));

      await request(app.getHttpServer())
        .get('/v1/charts/weight?range=30d')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);

      const me = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
      expect(me.body.plan).toBe('premium');
      expect(me.body.effectivePlan).toBe('premium');
      expect(me.body.trialEndsAt).toBeNull();
    });

    it('rechaza export RGPD a free', async () => {
      const u = await registerAndOnboard(app, 'free-no-export');
      await db
        .update(users)
        .set({ trialEndsAt: new Date(Date.now() - 1000) })
        .where(eq(users.id, u.id));
      await request(app.getHttpServer())
        .get('/v1/users/me/export')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(402);
    });

    it('rechaza weeks y path a free', async () => {
      const u = await registerAndOnboard(app, 'free-no-weeks');
      await db
        .update(users)
        .set({ trialEndsAt: new Date(Date.now() - 1000) })
        .where(eq(users.id, u.id));
      await request(app.getHttpServer())
        .get('/v1/weeks')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(402);
      await request(app.getHttpServer())
        .get('/v1/path/destination')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(402);
    });
  });

  describe('Webhook defensivo', () => {
    it('rechaza sin signature header', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/billing/webhooks')
        .set('Content-Type', 'application/json')
        .send({ id: 'evt_test', type: 'customer.subscription.created' });
      // Sin STRIPE_WEBHOOK_SECRET configurado en test, devuelve 400.
      expect([400]).toContain(res.status);
    });
  });
});

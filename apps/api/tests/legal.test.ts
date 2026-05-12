/**
 * Tests integración de la capa legal (Fase 16):
 *   - POST /v1/consents (registrar) y GET /v1/consents/me (listar)
 *   - GET /v1/users/me/export (export RGPD)
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

interface RegisteredUser {
  email: string;
  accessToken: string;
}

async function registerAndOnboard(
  app: INestApplication,
  suffix: string,
): Promise<RegisteredUser> {
  const email = `legal-${suffix}-${Date.now()}@test.local`;
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

  return { email, accessToken };
}

describe('Legal (Fase 16)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Consents', () => {
    it('POST /v1/consents registra una aceptación y GET /me la devuelve', async () => {
      const u = await registerAndOnboard(app, 'consent-record');

      const post = await request(app.getHttpServer())
        .post('/v1/consents')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ type: 'cookies', version: 1 })
        .expect(201);
      expect(post.body.type).toBe('cookies');
      expect(post.body.version).toBe(1);
      expect(post.body.acceptedAt).toBeDefined();

      const list = await request(app.getHttpServer())
        .get('/v1/consents/me')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
      expect(list.body.consents).toHaveLength(1);
      expect(list.body.consents[0].type).toBe('cookies');
    });

    it('múltiples aceptaciones del mismo tipo se acumulan en orden DESC', async () => {
      const u = await registerAndOnboard(app, 'consent-multi');
      for (const v of [1, 2, 3]) {
        await request(app.getHttpServer())
          .post('/v1/consents')
          .set('Authorization', `Bearer ${u.accessToken}`)
          .send({ type: 'terms', version: v })
          .expect(201);
      }
      const list = await request(app.getHttpServer())
        .get('/v1/consents/me')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);
      expect(list.body.consents).toHaveLength(3);
      // DESC: la versión más reciente aparece primero.
      expect(list.body.consents[0].version).toBe(3);
      expect(list.body.consents[2].version).toBe(1);
    });

    it('rechaza tipo inválido', async () => {
      const u = await registerAndOnboard(app, 'consent-bad');
      await request(app.getHttpServer())
        .post('/v1/consents')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ type: 'marketing', version: 1 })
        .expect(400);
    });

    it('aislamiento entre usuarios', async () => {
      const a = await registerAndOnboard(app, 'consent-iso-a');
      const b = await registerAndOnboard(app, 'consent-iso-b');
      await request(app.getHttpServer())
        .post('/v1/consents')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({ type: 'privacy', version: 1 })
        .expect(201);
      const listB = await request(app.getHttpServer())
        .get('/v1/consents/me')
        .set('Authorization', `Bearer ${b.accessToken}`)
        .expect(200);
      expect(listB.body.consents).toHaveLength(0);
    });
  });

  describe('Export RGPD', () => {
    it('GET /v1/users/me/export devuelve JSON adjunto con todas las secciones', async () => {
      const u = await registerAndOnboard(app, 'export-ok');

      // Generar algo de actividad: peso de hoy.
      const fecha = new Date().toISOString().slice(0, 10);
      await request(app.getHttpServer())
        .put('/v1/weights')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ fecha, pesoBasculaKg: 95.4 })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/v1/users/me/export')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="perdida-peso-export-\d{4}-\d{2}-\d{2}\.json"/,
      );
      expect(res.headers['cache-control']).toBe('no-store');

      const data = JSON.parse(res.text);
      expect(data.version).toBe(1);
      expect(data.user.email).toBe(u.email);
      // Sensible: el password_hash NO se incluye.
      expect(data.user.passwordHash).toBeUndefined();
      expect(data.profile).toHaveLength(1);
      expect(data.weights).toHaveLength(1);
      expect(data.weights[0].pesoBasculaKg).toBeDefined();

      // Estructura completa.
      for (const key of [
        'entries',
        'exercises',
        'attributes',
        'xpLog',
        'weeks',
        'milestones',
        'levelPurchases',
        'sessions',
        'emailTokens',
        'consents',
      ]) {
        expect(data[key]).toBeDefined();
        expect(Array.isArray(data[key])).toBe(true);
      }
    });

    it('export sin auth → 401', async () => {
      await request(app.getHttpServer())
        .get('/v1/users/me/export')
        .expect(401);
    });
  });
});

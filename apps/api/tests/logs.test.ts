/**
 * Tests integración de los endpoints de logs paginados (Fase 12):
 *   - GET /v1/xp/log con cursor
 *   - GET /v1/attributes/log con cursor + filtro
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AttributeLogPage, XpLogPage } from '@perdida-peso/schemas';
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
  const email = `logs-${suffix}-${Date.now()}@test.local`;
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

async function addManualXp(
  app: INestApplication,
  token: string,
  xp: number,
  descripcion: string,
  fecha?: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/v1/xp/manual')
    .set('Authorization', `Bearer ${token}`)
    .send({
      xp,
      descripcion,
      fecha: fecha ?? new Date().toISOString().slice(0, 10),
    })
    .expect(201);
}

async function incrementAttribute(
  app: INestApplication,
  token: string,
  code: string,
  fecha: string,
  descripcion?: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post(`/v1/attributes/${code}/increment`)
    .set('Authorization', `Bearer ${token}`)
    .send({ fecha, descripcion })
    .expect(201);
}

async function getXpLog(
  app: INestApplication,
  token: string,
  query: { cursor?: string; limit?: number } = {},
): Promise<XpLogPage> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await request(app.getHttpServer())
    .get(`/v1/xp/log${qs ? `?${qs}` : ''}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as XpLogPage;
}

async function getAttributesLog(
  app: INestApplication,
  token: string,
  query: { cursor?: string; limit?: number; atributo?: string } = {},
): Promise<AttributeLogPage> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.atributo) params.set('atributo', query.atributo);
  const qs = params.toString();
  const res = await request(app.getHttpServer())
    .get(`/v1/attributes/log${qs ? `?${qs}` : ''}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as AttributeLogPage;
}

describe('Logs paginados (Fase 12)', () => {
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

  describe('GET /v1/xp/log', () => {
    it('usuario sin entradas → entries vacío, total 0, nextCursor null', async () => {
      const u = await registerAndOnboard(app, 'xp-empty');
      const page = await getXpLog(app, u.accessToken);
      expect(page.entries).toHaveLength(0);
      expect(page.total).toBe(0);
      expect(page.nextCursor).toBeNull();
    });

    it('paginación con cursor: 5 inserciones, limit 2 → 3 páginas, sin duplicados', async () => {
      const u = await registerAndOnboard(app, 'xp-paginate');
      const hoy = new Date().toISOString().slice(0, 10);
      for (let i = 1; i <= 5; i++) {
        await addManualXp(app, u.accessToken, 10 * i, `Manual #${i}`, hoy);
      }

      const p1 = await getXpLog(app, u.accessToken, { limit: 2 });
      expect(p1.entries).toHaveLength(2);
      expect(p1.total).toBe(5);
      expect(p1.nextCursor).not.toBeNull();

      const p2 = await getXpLog(app, u.accessToken, {
        limit: 2,
        cursor: p1.nextCursor!,
      });
      expect(p2.entries).toHaveLength(2);
      expect(p2.nextCursor).not.toBeNull();

      const p3 = await getXpLog(app, u.accessToken, {
        limit: 2,
        cursor: p2.nextCursor!,
      });
      expect(p3.entries).toHaveLength(1);
      expect(p3.nextCursor).toBeNull();

      // Sin duplicados a través de páginas.
      const ids = [
        ...p1.entries.map((e) => e.id),
        ...p2.entries.map((e) => e.id),
        ...p3.entries.map((e) => e.id),
      ];
      expect(new Set(ids).size).toBe(5);
    });

    it('cursor inválido (basura) se ignora y devuelve la primera página', async () => {
      const u = await registerAndOnboard(app, 'xp-badcursor');
      await addManualXp(app, u.accessToken, 10, 'Único');
      const page = await getXpLog(app, u.accessToken, { cursor: 'no-base64-***' });
      expect(page.entries).toHaveLength(1);
      expect(page.total).toBe(1);
    });

    it('aislamiento entre usuarios', async () => {
      const a = await registerAndOnboard(app, 'xp-iso-a');
      const b = await registerAndOnboard(app, 'xp-iso-b');
      await addManualXp(app, a.accessToken, 50, 'Solo A');

      const pageA = await getXpLog(app, a.accessToken);
      const pageB = await getXpLog(app, b.accessToken);
      expect(pageA.total).toBe(1);
      expect(pageB.total).toBe(0);
      expect(pageB.entries).toHaveLength(0);
    });
  });

  describe('GET /v1/attributes/log', () => {
    it('lista, total y filtro por atributo', async () => {
      const u = await registerAndOnboard(app, 'attr-filter');
      const hoy = new Date().toISOString().slice(0, 10);
      const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const anteayer = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);

      await incrementAttribute(app, u.accessToken, 'FUE', hoy, 'rutina pesas');
      await incrementAttribute(app, u.accessToken, 'VIT', hoy, 'paseo largo');
      await incrementAttribute(app, u.accessToken, 'FUE', ayer, 'pull day');
      await incrementAttribute(app, u.accessToken, 'INT', anteayer, 'lectura');

      const all = await getAttributesLog(app, u.accessToken);
      expect(all.total).toBe(4);
      expect(all.entries).toHaveLength(4);
      expect(all.filter).toBeNull();

      const onlyFUE = await getAttributesLog(app, u.accessToken, { atributo: 'FUE' });
      expect(onlyFUE.total).toBe(2);
      expect(onlyFUE.entries.every((e) => e.atributo === 'FUE')).toBe(true);
      expect(onlyFUE.filter).toBe('FUE');
    });

    it('paginación con filtro: cursor mantiene el filtro entre páginas', async () => {
      const u = await registerAndOnboard(app, 'attr-paginate');
      // 4 fechas distintas para evitar el rechazo "Ya has registrado un +1 hoy".
      for (let i = 0; i < 4; i++) {
        const fecha = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        await incrementAttribute(app, u.accessToken, 'CRE', fecha);
      }

      const p1 = await getAttributesLog(app, u.accessToken, {
        atributo: 'CRE',
        limit: 2,
      });
      expect(p1.entries).toHaveLength(2);
      expect(p1.total).toBe(4);
      expect(p1.nextCursor).not.toBeNull();

      const p2 = await getAttributesLog(app, u.accessToken, {
        atributo: 'CRE',
        limit: 2,
        cursor: p1.nextCursor!,
      });
      expect(p2.entries).toHaveLength(2);
      expect(p2.nextCursor).toBeNull();

      const idsP1 = p1.entries.map((e) => e.id);
      const idsP2 = p2.entries.map((e) => e.id);
      expect(idsP1.some((id) => idsP2.includes(id))).toBe(false);
    });

    it('atributo inexistente en zod → 400', async () => {
      const u = await registerAndOnboard(app, 'attr-bad');
      await request(app.getHttpServer())
        .get('/v1/attributes/log?atributo=XXX')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(400);
    });
  });
});

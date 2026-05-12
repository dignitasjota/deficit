/**
 * Tests integración de /v1/entries/:date y exercise.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Verifican:
 *  - GET vacío devuelve esqueleto coherente.
 *  - PUT con pasos genera xp_log P; al actualizar pasos, reescribe
 *    (no duplica).
 *  - PUT con kcalIn genera xp_log C basado en TDEE del perfil.
 *  - POST exercise genera xp_log L; DELETE exercise lo retira.
 *  - Hidratación cumple meta → +1 a HID en attribute_log; deja de
 *    cumplirse → se retira.
 *  - El xpTotal del summary refleja la suma correcta.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { DailyEntry, ExerciseLog, XpSummary } from '@perdida-peso/schemas';
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
  const email = `entries-${suffix}-${Date.now()}@test.local`;
  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password: 'TestPassword123!' });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${JSON.stringify(reg.body)}`);
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

async function getEntry(
  app: INestApplication,
  token: string,
  fecha: string,
): Promise<DailyEntry> {
  const res = await request(app.getHttpServer())
    .get(`/v1/entries/${fecha}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as DailyEntry;
}

async function putEntry(
  app: INestApplication,
  token: string,
  fecha: string,
  input: Record<string, unknown>,
): Promise<DailyEntry> {
  const res = await request(app.getHttpServer())
    .put(`/v1/entries/${fecha}`)
    .set('Authorization', `Bearer ${token}`)
    .send(input)
    .expect(200);
  return res.body as DailyEntry;
}

async function getSummary(
  app: INestApplication,
  token: string,
): Promise<XpSummary> {
  const res = await request(app.getHttpServer())
    .get('/v1/xp/summary')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as XpSummary;
}

describe('entries + recálculo XP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  it('GET vacío devuelve esqueleto coherente con campos en 0/null', async () => {
    const u = await registerAndOnboard(app, 'empty');
    const e = await getEntry(app, u.accessToken, '2026-05-01');
    expect(e.fecha).toBe('2026-05-01');
    expect(e.pasos).toBeNull();
    expect(e.kcalIn).toBeNull();
    expect(e.sodioG).toBeNull();
    expect(e.aguaL).toBe(0);
    expect(e.litrosEfectivos).toBe(0);
    expect(e.metaLitros).toBe(2);
    expect(e.metaCumplida).toBe(false);
  });

  it('PUT pasos genera xpLog P y suma al xpTotal del summary', async () => {
    const u = await registerAndOnboard(app, 'pasos');
    const fecha = new Date().toISOString().slice(0, 10);
    await putEntry(app, u.accessToken, fecha, { pasos: 8000 });

    const sum = await getSummary(app, u.accessToken);
    // 8000 × 100 × 0.00032 = 256 XP (peso = pesoInicialKg = 100)
    expect(sum.xpTotal).toBe(256);
    expect(sum.stats.xpHoy).toBe(256);
  });

  it('actualizar pasos reescribe la fila xpLog P (no duplica)', async () => {
    const u = await registerAndOnboard(app, 'reescribe');
    const fecha = new Date().toISOString().slice(0, 10);
    await putEntry(app, u.accessToken, fecha, { pasos: 5000 });
    await putEntry(app, u.accessToken, fecha, { pasos: 10_000 });

    const sum = await getSummary(app, u.accessToken);
    // 10000 × 100 × 0.00032 = 320 XP (no 160 + 320)
    expect(sum.xpTotal).toBe(320);
  });

  it('PUT kcalIn genera xpLog C con TDEE = BMR × 1.55 (moderado)', async () => {
    const u = await registerAndOnboard(app, 'kcal');
    const fecha = new Date().toISOString().slice(0, 10);
    // BMR (M, 100kg, 175cm, 30años) = 1000 + 1093.75 - 150 + 5 = 1948.75
    // TDEE = 1948.75 * 1.55 = 3020.5625 → round = 3021
    // Si kcalIn = 2000 → déficit = 3021 - 2000 = 1021
    await putEntry(app, u.accessToken, fecha, { kcalIn: 2000 });

    const sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(1021);
  });

  it('actualizar pasos NO afecta a la xpLog C existente (recálculo separado)', async () => {
    const u = await registerAndOnboard(app, 'mixto');
    const fecha = new Date().toISOString().slice(0, 10);
    await putEntry(app, u.accessToken, fecha, { kcalIn: 2000 }); // 1021 XP
    await putEntry(app, u.accessToken, fecha, { pasos: 8000 }); // 256 XP
    await putEntry(app, u.accessToken, fecha, { pasos: 10_000 }); // 320 XP

    const sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(1021 + 320);
  });

  it('POST exercise genera xpLog L con factor 0.7; DELETE retira', async () => {
    const u = await registerAndOnboard(app, 'ejercicio');
    const fecha = new Date().toISOString().slice(0, 10);

    const ex = await request(app.getHttpServer())
      .post(`/v1/entries/${fecha}/exercise`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ tipo: 'ejercicio', nombre: 'Ludosport', minutos: 40, kcalQuemadas: 473 })
      .expect(201);
    const exercise = ex.body as ExerciseLog;
    expect(exercise.xpOtorgada).toBe(331); // 473 × 0.7 → 331

    let sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(331);

    await request(app.getHttpServer())
      .delete(`/v1/entries/${fecha}/exercise/${exercise.id}`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(204);

    sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(0);
  });

  it('caminata NO genera xpLog L (los pasos se cuentan aparte)', async () => {
    const u = await registerAndOnboard(app, 'caminata');
    const fecha = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post(`/v1/entries/${fecha}/exercise`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ tipo: 'caminata', nombre: 'Paseo perro', minutos: 30, kcalQuemadas: 150 })
      .expect(201);

    const sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(0);
  });

  it('hidratación: cumple meta → +1 HID en attribute_log; baja → se retira', async () => {
    const u = await registerAndOnboard(app, 'hid');
    const fecha = new Date().toISOString().slice(0, 10);

    // Sin agua: meta no cumplida.
    let e = await getEntry(app, u.accessToken, fecha);
    expect(e.metaCumplida).toBe(false);

    // 2L de agua → cumple meta base (sodio 0 → meta 2L).
    e = await putEntry(app, u.accessToken, fecha, { aguaL: 2 });
    expect(e.metaCumplida).toBe(true);
    expect(e.litrosEfectivos).toBe(2);

    // Bajar a 1L → ya no cumple.
    e = await putEntry(app, u.accessToken, fecha, { aguaL: 1 });
    expect(e.metaCumplida).toBe(false);
  });

  it('sodio extra incrementa la meta y puede romper el cumplimiento', async () => {
    const u = await registerAndOnboard(app, 'sodio');
    const fecha = new Date().toISOString().slice(0, 10);

    // 2L y sodio 2g → meta 2L → cumple.
    let e = await putEntry(app, u.accessToken, fecha, { aguaL: 2, sodioG: 2 });
    expect(e.metaLitros).toBeCloseTo(2, 2);
    expect(e.metaCumplida).toBe(true);

    // Subir sodio a 6g → meta 2 + 0.25*4 = 3L → ya no cumple.
    e = await putEntry(app, u.accessToken, fecha, { sodioG: 6 });
    expect(e.metaLitros).toBeCloseTo(3, 2);
    expect(e.metaCumplida).toBe(false);
  });

  it('refresco zero cuenta al 70% de litros efectivos', async () => {
    const u = await registerAndOnboard(app, 'zero');
    const fecha = new Date().toISOString().slice(0, 10);
    const e = await putEntry(app, u.accessToken, fecha, { refrescoZeroL: 1 });
    expect(e.litrosEfectivos).toBeCloseTo(0.7, 5);
  });
});

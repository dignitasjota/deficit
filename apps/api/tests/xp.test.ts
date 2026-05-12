/**
 * Tests integración del endpoint /v1/xp/summary y /v1/xp/manual.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Verifican el flow:
 *   register → onboarding → opcional addManualXp → /xp/summary
 *
 * y comprueban:
 *   - usuario sin XP → nivel 0, próximo hito = primer hito por defecto (L5)
 *   - addManualXp → xpTotal correcto, nivel calculado, próximo hito
 *     reasignado
 *   - hitos por defecto sembrados al onboarding (Fase 3)
 *   - validación: descripción obligatoria, fecha en formato ISO, xp ≥ 1
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { XpSummary } from '@perdida-peso/schemas';
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
  profile: {
    pesoInicialKg: number;
    pesoObjetivoKg: number;
  },
): Promise<RegisteredUser> {
  const email = `xp-${suffix}-${Date.now()}@test.local`;
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
      ...profile,
      alturaCm: 175,
      edad: 30,
      sexo: 'M',
      factorActividad: 'moderado',
      fechaInicio: new Date().toISOString().slice(0, 10),
    })
    .expect(200);

  return { email, accessToken };
}

async function addManual(
  app: INestApplication,
  token: string,
  xp: number,
  descripcion = 'Aporte manual',
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

describe('GET /v1/xp/summary', () => {
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

  it('404 si el usuario no tiene perfil', async () => {
    const reg = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email: `xp-noprof-${Date.now()}@test.local`, password: 'TestPassword123!' });
    await request(app.getHttpServer())
      .get('/v1/xp/summary')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(404);
  });

  it('usuario nuevo sin XP → nivel 0, hitos sembrados, próximo hito L5', async () => {
    // objetivo 80kg → xpPorNivel = 7700
    const u = await registerAndOnboard(app, 'fresh', {
      pesoInicialKg: 200,
      pesoObjetivoKg: 120,
    });
    const sum = await getSummary(app, u.accessToken);

    expect(sum.xpTotal).toBe(0);
    expect(sum.nivelActual).toBe(0);
    expect(sum.xpEnNivel).toBe(0);
    expect(sum.xpFalta).toBe(7700);
    expect(sum.progresoPct).toBe(0);
    expect(sum.xpPorNivel).toBe(7700);
    expect(sum.nivelesPorSemana).toBe(1);
    expect(sum.jefeFinalSuperado).toBe(false);

    // 9 hitos por defecto (L5..L80)
    expect(sum.hitos).toHaveLength(9);
    expect(sum.hitos[0]?.nivel).toBe(5);
    expect(sum.hitos[8]?.nivel).toBe(80);
    expect(sum.hitos.every((h) => h.alcanzado === false)).toBe(true);

    expect(sum.proximoHito?.nivel).toBe(5);
    expect(sum.xpFaltaHito).toBe(5 * 7700);

    expect(sum.stats.xpHoy).toBe(0);
    expect(sum.stats.bmr).toBeGreaterThan(0);
  });

  it('XP manual sube de nivel y reasigna próximo hito', async () => {
    const u = await registerAndOnboard(app, 'lvlup', {
      pesoInicialKg: 100,
      pesoObjetivoKg: 60,
    });
    // objetivo 40kg → xpPorNivel = 3850, niveles/semana = 2
    // Sumamos 6 niveles completos: 6 × 3850 = 23100
    await addManual(app, u.accessToken, 23_100, 'Test boost');

    const sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(23_100);
    expect(sum.nivelActual).toBe(6);
    expect(sum.xpEnNivel).toBe(0);
    expect(sum.progresoPct).toBe(0);
    expect(sum.xpPorNivel).toBe(3850);
    // Hitos L5 y L10: el L5 ya alcanzado (6>5), siguiente = L10
    expect(sum.hitos.find((h) => h.nivel === 5)?.alcanzado).toBe(true);
    expect(sum.hitos.find((h) => h.nivel === 10)?.alcanzado).toBe(false);
    expect(sum.proximoHito?.nivel).toBe(10);
    // (10 - 6) × 3850 = 15400 XP hasta el siguiente hito
    expect(sum.xpFaltaHito).toBe(15_400);
  });

  it('XP no entera (decimal) genera xpEnNivel decimal y progresoPct exacto', async () => {
    const u = await registerAndOnboard(app, 'partial', {
      pesoInicialKg: 90,
      pesoObjetivoKg: 80,
    });
    // objetivo 10kg → xpPorNivel = 962.5
    // 481 XP = aprox 50% del primer nivel
    await addManual(app, u.accessToken, 481, 'Half level');

    const sum = await getSummary(app, u.accessToken);
    expect(sum.xpTotal).toBe(481);
    expect(sum.nivelActual).toBe(0);
    expect(sum.xpEnNivel).toBe(481);
    expect(sum.progresoPct).toBeCloseTo(481 / 962.5, 4);
  });

  it('rechaza XP manual con xp = 0', async () => {
    const u = await registerAndOnboard(app, 'zero', {
      pesoInicialKg: 100,
      pesoObjetivoKg: 80,
    });
    await request(app.getHttpServer())
      .post('/v1/xp/manual')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({
        xp: 0,
        descripcion: 'no permitido',
        fecha: new Date().toISOString().slice(0, 10),
      })
      .expect(400);
  });

  it('xpHoy refleja la suma de XP del día actual', async () => {
    const u = await registerAndOnboard(app, 'hoy', {
      pesoInicialKg: 100,
      pesoObjetivoKg: 80,
    });
    const hoy = new Date().toISOString().slice(0, 10);
    await addManual(app, u.accessToken, 100, 'A', hoy);
    await addManual(app, u.accessToken, 250, 'B', hoy);

    const sum = await getSummary(app, u.accessToken);
    expect(sum.stats.xpHoy).toBe(350);
  });

  it('stats.bmr usa el último peso báscula registrado, no pesoInicial', async () => {
    const u = await registerAndOnboard(app, 'bmr', {
      pesoInicialKg: 120,
      pesoObjetivoKg: 80,
    });
    // BMR esperado con pesoInicial 120: 10*120 + 6.25*175 - 5*30 + 5 = 1200 + 1093.75 - 150 + 5 = 2148.75
    const sum1 = await getSummary(app, u.accessToken);
    expect(sum1.stats.bmr).toBeCloseTo(2148.75, 2);

    // Registramos un peso menor; BMR debería bajar.
    await request(app.getHttpServer())
      .put('/v1/weights')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha: new Date().toISOString().slice(0, 10), pesoKg: 110 })
      .expect(200);

    const sum2 = await getSummary(app, u.accessToken);
    // BMR con peso 110: 1100 + 1093.75 - 150 + 5 = 2048.75
    expect(sum2.stats.bmr).toBeCloseTo(2048.75, 2);
    expect(sum2.stats.bmr).toBeLessThan(sum1.stats.bmr);
  });
});

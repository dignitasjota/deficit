/**
 * Tests integración de /v1/charts/weight.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Cubren:
 *  - Sin datos → serie de N puntos con peso null y peso teórico = peso_inicial.
 *  - Con pesos → media móvil 7d se calcula correctamente.
 *  - XP manual → peso teórico baja en xp/7700 a partir de la fecha.
 *  - Banda min < max siempre (porque retención mínima > 0).
 *  - Filtros 7d / 30d / all.
 *  - Stats min/max/delta sobre los pesos no-null.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { WeightChartResponse } from '@perdida-peso/schemas';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

const MS_DIA = 24 * 60 * 60 * 1000;

interface RegisteredUser {
  email: string;
  accessToken: string;
}

async function registerAndOnboard(
  app: INestApplication,
  suffix: string,
  fechaInicioOffsetDias = 0,
): Promise<RegisteredUser> {
  const email = `chart-${suffix}-${Date.now()}@test.local`;
  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password: 'TestPassword123!' });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${JSON.stringify(reg.body)}`);
  }
  const accessToken = reg.body.accessToken as string;

  const fechaInicio = new Date(Date.now() - fechaInicioOffsetDias * MS_DIA)
    .toISOString()
    .slice(0, 10);

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
      fechaInicio,
    })
    .expect(200);

  return { email, accessToken };
}

async function putPeso(
  app: INestApplication,
  token: string,
  fecha: string,
  pesoKg: number,
): Promise<void> {
  await request(app.getHttpServer())
    .put('/v1/weights')
    .set('Authorization', `Bearer ${token}`)
    .send({ fecha, pesoKg })
    .expect(200);
}

async function getChart(
  app: INestApplication,
  token: string,
  range = '30d',
): Promise<WeightChartResponse> {
  const res = await request(app.getHttpServer())
    .get(`/v1/charts/weight?range=${range}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as WeightChartResponse;
}

function isoOffset(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * MS_DIA).toISOString().slice(0, 10);
}

describe('GET /v1/charts/weight', () => {
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

  it('sin datos: serie con peso null y peso teórico = peso inicial', async () => {
    const u = await registerAndOnboard(app, 'empty', 30);
    const r = await getChart(app, u.accessToken, '7d');

    expect(r.range).toBe('7d');
    expect(r.puntos).toHaveLength(7);
    for (const p of r.puntos) {
      expect(p.pesoReal).toBeNull();
      expect(p.media7d).toBeNull();
      expect(p.pesoTeorico).toBeCloseTo(100, 5);
      expect(p.rangoMin).toBeLessThan(p.rangoMax);
    }
    expect(r.stats.min).toBeNull();
    expect(r.stats.max).toBeNull();
    expect(r.stats.delta).toBeNull();
  });

  it('un peso → media 7d = ese peso, stats min=max=peso, delta null', async () => {
    const u = await registerAndOnboard(app, 'one', 7);
    const hoy = isoOffset(0);
    await putPeso(app, u.accessToken, hoy, 99.5);

    const r = await getChart(app, u.accessToken, '7d');
    const ultimo = r.puntos[r.puntos.length - 1]!;
    expect(ultimo.pesoReal).toBeCloseTo(99.5, 5);
    expect(ultimo.media7d).toBeCloseTo(99.5, 5);
    expect(r.stats.min).toBeCloseTo(99.5, 5);
    expect(r.stats.max).toBeCloseTo(99.5, 5);
    expect(r.stats.delta).toBeNull(); // delta requiere ≥ 2 muestras
  });

  it('dos pesos → delta = peso_último − peso_primero', async () => {
    const u = await registerAndOnboard(app, 'delta', 7);
    await putPeso(app, u.accessToken, isoOffset(-3), 100);
    await putPeso(app, u.accessToken, isoOffset(0), 98.5);

    const r = await getChart(app, u.accessToken, '7d');
    expect(r.stats.min).toBeCloseTo(98.5, 5);
    expect(r.stats.max).toBeCloseTo(100, 5);
    expect(r.stats.delta).toBeCloseTo(-1.5, 5);
  });

  it('XP manual → peso teórico baja en xp/7700 desde esa fecha', async () => {
    const u = await registerAndOnboard(app, 'xp', 5);
    // Añadimos 7700 XP de hace 2 días → desde entonces el teórico baja 1kg.
    await request(app.getHttpServer())
      .post('/v1/xp/manual')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha: isoOffset(-2), xp: 7700, descripcion: 'test' })
      .expect(201);

    const r = await getChart(app, u.accessToken, '7d');
    const before = r.puntos.find((p) => p.fecha === isoOffset(-3));
    const after = r.puntos.find((p) => p.fecha === isoOffset(-1));
    expect(before?.pesoTeorico).toBeCloseTo(100, 5);
    expect(after?.pesoTeorico).toBeCloseTo(99, 5);
  });

  it('rango all parte de fecha_inicio del usuario', async () => {
    const u = await registerAndOnboard(app, 'all', 5);
    const r = await getChart(app, u.accessToken, 'all');
    expect(r.range).toBe('all');
    expect(r.puntos.length).toBe(6); // 5 días + hoy
  });

  it('rango por defecto si falta query → 30d', async () => {
    const u = await registerAndOnboard(app, 'default', 30);
    const res = await request(app.getHttpServer())
      .get('/v1/charts/weight')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);
    const data = res.body as WeightChartResponse;
    expect(data.range).toBe('30d');
    expect(data.puntos.length).toBe(30);
  });

  it('rango inválido → 400', async () => {
    const u = await registerAndOnboard(app, 'bad', 5);
    await request(app.getHttpServer())
      .get('/v1/charts/weight?range=invalido')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(400);
  });

  it('banda rango_min < rango_max siempre (retención mínima 1.3 > 0)', async () => {
    const u = await registerAndOnboard(app, 'banda', 7);
    const r = await getChart(app, u.accessToken, '7d');
    for (const p of r.puntos) {
      expect(p.rangoMin).toBeLessThan(p.rangoMax);
    }
  });
});

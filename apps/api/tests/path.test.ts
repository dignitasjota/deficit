/**
 * Tests integración de /v1/path/destination y /v1/path/buy-level.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Cubren:
 *  - Usuario nuevo: nivel 0, conseguidos vacíos, por venir 80 niveles.
 *  - XP manual cruza niveles → conseguidos NATURAL aparecen en orden.
 *  - Comprar nivel sin colchón → 400.
 *  - Comprar nivel con colchón → +1 nivel, colchón baja.
 *  - Comprar más allá de L80 → 400.
 *  - XpSummary refleja nivelActual = naturales + comprados.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PathDestination, XpSummary } from '@perdida-peso/schemas';
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
  diasDesdeInicio: number,
  pesoInicialKg = 100,
  pesoObjetivoKg = 80,
): Promise<RegisteredUser> {
  const email = `path-${suffix}-${Date.now()}@test.local`;
  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password: 'TestPassword123!' });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${JSON.stringify(reg.body)}`);
  }
  const accessToken = reg.body.accessToken as string;

  const fechaInicio = new Date(Date.now() - diasDesdeInicio * MS_DIA).toISOString().slice(0, 10);

  await request(app.getHttpServer())
    .put('/v1/users/me/profile')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      pesoInicialKg,
      pesoObjetivoKg,
      alturaCm: 175,
      edad: 30,
      sexo: 'M',
      factorActividad: 'moderado',
      fechaInicio,
    })
    .expect(200);

  return { email, accessToken };
}

async function addManualXp(
  app: INestApplication,
  token: string,
  fecha: string,
  xp: number,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/v1/xp/manual')
    .set('Authorization', `Bearer ${token}`)
    .send({ fecha, xp, descripcion: `test ${xp}` })
    .expect(201);
}

async function getPath(app: INestApplication, token: string): Promise<PathDestination> {
  const res = await request(app.getHttpServer())
    .get('/v1/path/destination')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as PathDestination;
}

function isoOffset(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * MS_DIA).toISOString().slice(0, 10);
}

describe('path', () => {
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

  it('usuario nuevo → nivel 0, conseguidos vacíos, por venir 80', async () => {
    const u = await registerAndOnboard(app, 'fresh', 0);
    const p = await getPath(app, u.accessToken);
    expect(p.nivelActual).toBe(0);
    expect(p.nivelesNaturales).toBe(0);
    expect(p.nivelesComprados).toBe(0);
    expect(p.destino).toBe(80);
    expect(p.nivelesRestantes).toBe(80);
    expect(p.conseguidos).toHaveLength(0);
    expect(p.porVenir).toHaveLength(80);
    expect(p.puedeComprar).toBe(false); // colchón 0
  });

  it('XP manual cruza niveles → conseguidos NATURAL aparecen', async () => {
    // Objetivo 80 kg → xpPorNivel = (80/80)·7700 = 7700.
    const u = await registerAndOnboard(app, 'cross', 0, 200, 120);
    await addManualXp(app, u.accessToken, isoOffset(0), 23_100); // 3 niveles

    const p = await getPath(app, u.accessToken);
    expect(p.nivelesNaturales).toBe(3);
    expect(p.nivelActual).toBe(3);
    expect(p.conseguidos).toHaveLength(3);
    expect(p.conseguidos.every((c) => c.origin === 'NATURAL')).toBe(true);
    // DESC: nivel 3 primero
    expect(p.conseguidos[0]?.nivel).toBe(3);
    expect(p.conseguidos[2]?.nivel).toBe(1);
  });

  it('comprar nivel sin colchón → 400', async () => {
    const u = await registerAndOnboard(app, 'nocolchon', 0);
    await request(app.getHttpServer())
      .post('/v1/path/buy-level')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(400);
  });

  it('comprar con colchón suficiente → +1 nivel, colchón baja', async () => {
    // Objetivo 80kg → xpPorNivel = 7700.
    // Crear colchón haciendo una semana antigua con MAS_XP.
    const u = await registerAndOnboard(app, 'compra', 14, 200, 120);
    await addManualXp(app, u.accessToken, isoOffset(-10), 16_000); // 8300 al colchón
    // Materializar weeks llamando al endpoint.
    await request(app.getHttpServer())
      .get('/v1/weeks')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);

    const before = await getPath(app, u.accessToken);
    expect(before.colchonDisponible).toBeGreaterThanOrEqual(7700);
    expect(before.puedeComprar).toBe(true);

    const buyRes = await request(app.getHttpServer())
      .post('/v1/path/buy-level')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(201);

    expect(buyRes.body.colchonRestante).toBe(before.colchonDisponible - 7700);

    const after = await getPath(app, u.accessToken);
    expect(after.nivelesComprados).toBe(1);
    expect(after.nivelActual).toBe(before.nivelActual + 1);
    expect(after.colchonDisponible).toBe(before.colchonDisponible - 7700);
    // Conseguidos incluye una entrada COMPRADA además de las naturales.
    const compradas = after.conseguidos.filter((c) => c.origin === 'COMPRADA');
    expect(compradas).toHaveLength(1);
  });

  it('XpSummary refleja nivelActual = naturales + comprados', async () => {
    const u = await registerAndOnboard(app, 'sum', 14, 200, 120);
    await addManualXp(app, u.accessToken, isoOffset(-10), 16_000); // 2 naturales + 8300 colchón
    await request(app.getHttpServer())
      .get('/v1/weeks')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);

    // Comprar 1 nivel
    await request(app.getHttpServer())
      .post('/v1/path/buy-level')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(201);

    const sum = (
      await request(app.getHttpServer())
        .get('/v1/xp/summary')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200)
    ).body as XpSummary;

    // 16000 / 7700 = 2 naturales + 1 comprado = 3
    expect(sum.nivelActual).toBe(3);
  });

  it('NIVEL 80 → no se puede comprar más', async () => {
    // Setup: usuario con objetivo pequeño + mucho XP para llegar a L80.
    // Objetivo 10kg → xpPorNivel = 962.5.
    // 80 niveles × 962.5 = 77000 XP.
    const u = await registerAndOnboard(app, 'cap', 0, 90, 80);
    await addManualXp(app, u.accessToken, isoOffset(0), 80_000);

    const p = await getPath(app, u.accessToken);
    expect(p.nivelActual).toBe(80);
    expect(p.nivelesRestantes).toBe(0);
    expect(p.puedeComprar).toBe(false);

    await request(app.getHttpServer())
      .post('/v1/path/buy-level')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(400);
  });
});

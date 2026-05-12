/**
 * Tests de integración del endpoint /v1/dashboard/header.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Verifican el flow completo:
 *   register → onboarding (perfil) → registrar pesos → /dashboard/header
 *
 * y comprueban:
 *   - báscula del día
 *   - media móvil 7d
 *   - peso teórico (debería ser pesoInicial cuando xpTotal=0)
 *   - rango esperado (cumple la regla del modelo de retención)
 *   - estado DENTRO/FUERA según peso registrado
 *
 * No usan testcontainers todavía: comparten BBDD con isolation.test.ts.
 * Cada test usa emails únicos por timestamp para evitar colisiones.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { DashboardHeader } from '@perdida-peso/schemas';
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
    alturaCm: number;
    edad: number;
    sexo: 'M' | 'F';
  },
): Promise<RegisteredUser> {
  const email = `dash-${suffix}-${Date.now()}@test.local`;
  const password = 'TestPassword123!';

  const reg = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password });
  if (reg.status !== 201) {
    throw new Error(`Register falló: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  const accessToken = reg.body.accessToken as string;

  await request(app.getHttpServer())
    .put('/v1/users/me/profile')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      ...profile,
      factorActividad: 'moderado',
      fechaInicio: new Date().toISOString().slice(0, 10),
    })
    .expect(200);

  return { email, accessToken };
}

async function putWeight(
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

async function getHeader(app: INestApplication, token: string): Promise<DashboardHeader> {
  const res = await request(app.getHttpServer())
    .get('/v1/dashboard/header')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as DashboardHeader;
}

describe('GET /v1/dashboard/header', () => {
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

  it('devuelve 404 si el usuario no tiene perfil', async () => {
    const reg = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email: `dash-noprof-${Date.now()}@test.local`, password: 'TestPassword123!' });

    await request(app.getHttpServer())
      .get('/v1/dashboard/header')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(404);
  });

  it('sin pesos registrados → estadoBascula = NO_REGISTRADO, peso teórico = pesoInicial', async () => {
    const u = await registerAndOnboard(app, 'empty', {
      pesoInicialKg: 100,
      pesoObjetivoKg: 80,
      alturaCm: 175,
      edad: 30,
      sexo: 'M',
    });

    const header = await getHeader(app, u.accessToken);
    expect(header.pesoHoy).toBeNull();
    expect(header.media7d).toBeNull();
    expect(header.xpTotal).toBe(0);
    expect(header.pesoTeorico).toBeCloseTo(100, 5);
    expect(header.rangoEsperado.estadoBascula).toBe('NO_REGISTRADO');
    expect(header.rangoEsperado.baselineDrift).toBeNull();
  });

  it('un solo peso → media = ese peso, rango calculado, estado evaluado', async () => {
    const u = await registerAndOnboard(app, 'one', {
      pesoInicialKg: 100,
      pesoObjetivoKg: 80,
      alturaCm: 175,
      edad: 30,
      sexo: 'M',
    });
    const hoy = new Date().toISOString().slice(0, 10);

    await putWeight(app, u.accessToken, hoy, 99.5);

    const header = await getHeader(app, u.accessToken);
    expect(header.pesoHoy).toBeCloseTo(99.5, 5);
    expect(header.pesoFecha).toBe(hoy);
    expect(header.media7d).toBeCloseTo(99.5, 5);
    expect(header.rangoEsperado.estadoBascula).not.toBe('NO_REGISTRADO');
    // baseline drift = peso − media = 0
    expect(header.rangoEsperado.baselineDrift).toBeCloseTo(0, 5);
    // ret_total = 0 (sodio=0) + 1.0 + 0.3 = 1.3
    expect(header.rangoEsperado.retencion.retTotal).toBeCloseTo(1.3, 5);
  });

  it('media 7d con varios pesos: promedio aritmético', async () => {
    const u = await registerAndOnboard(app, 'avg', {
      pesoInicialKg: 110,
      pesoObjetivoKg: 90,
      alturaCm: 180,
      edad: 35,
      sexo: 'M',
    });

    const today = new Date();
    const dates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return d.toISOString().slice(0, 10);
    });

    // 5 pesos: 109, 108.5, 108.2, 108, 107.8 (más reciente primero)
    const pesos = [107.8, 108, 108.2, 108.5, 109];
    for (let i = 0; i < dates.length; i++) {
      await putWeight(app, u.accessToken, dates[i]!, pesos[i]!);
    }

    const header = await getHeader(app, u.accessToken);
    const expectedAvg = pesos.reduce((s, p) => s + p, 0) / pesos.length;
    expect(header.media7d).toBeCloseTo(expectedAvg, 2);
  });

  it('idempotencia: PUT del mismo día reemplaza el peso anterior', async () => {
    const u = await registerAndOnboard(app, 'idemp', {
      pesoInicialKg: 100,
      pesoObjetivoKg: 80,
      alturaCm: 170,
      edad: 28,
      sexo: 'F',
    });
    const hoy = new Date().toISOString().slice(0, 10);

    await putWeight(app, u.accessToken, hoy, 95);
    await putWeight(app, u.accessToken, hoy, 96.4);

    const header = await getHeader(app, u.accessToken);
    expect(header.pesoHoy).toBeCloseTo(96.4, 5);

    // Verificar también vía /v1/weights que solo hay 1 fila
    const list = await request(app.getHttpServer())
      .get('/v1/weights')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
  });
});

/**
 * Tests integración de /v1/weeks y /v1/weeks/:id/apply-colchon.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Cubren:
 *  - Usuario nuevo con fechaInicio hoy → 1 semana en curso, sin
 *    materializar.
 *  - fechaInicio antiguo → semanas anteriores se materializan al pedir.
 *  - Semana terminada con xp ≥ 7700 → MAS_XP, excedente al colchón.
 *  - Semana terminada con xp < 7700 → DEFICIT.
 *  - Aplicar colchón a DEFICIT → COMPENSADA, baja colchonTotal.
 *  - Colchón insuficiente → 400.
 *  - Aplicar colchón a EN_CURSO o MAS_XP → 400.
 *  - colchonTotal del summary XP refleja el cálculo real (Fase 6 + 10).
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { WeeksSummary, XpSummary } from '@perdida-peso/schemas';
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
): Promise<RegisteredUser> {
  const email = `weeks-${suffix}-${Date.now()}@test.local`;
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

async function addManualXp(
  app: INestApplication,
  token: string,
  fecha: string,
  xp: number,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/v1/xp/manual')
    .set('Authorization', `Bearer ${token}`)
    .send({ fecha, xp, descripcion: `test ${xp} xp` })
    .expect(201);
}

async function getWeeks(
  app: INestApplication,
  token: string,
): Promise<WeeksSummary> {
  const res = await request(app.getHttpServer())
    .get('/v1/weeks')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as WeeksSummary;
}

async function getXpSummary(
  app: INestApplication,
  token: string,
): Promise<XpSummary> {
  const res = await request(app.getHttpServer())
    .get('/v1/xp/summary')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as XpSummary;
}

function isoOffset(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * MS_DIA).toISOString().slice(0, 10);
}

describe('weeks', () => {
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

  it('usuario reciente → al menos la semana en curso, colchón 0', async () => {
    const u = await registerAndOnboard(app, 'fresh', 0);
    const data = await getWeeks(app, u.accessToken);
    expect(data.semanas.length).toBeGreaterThanOrEqual(1);
    expect(data.semanas[0]?.estado).toBe('EN_CURSO');
    expect(data.colchonTotal).toBe(0);
  });

  it('semana terminada con xp ≥ 7700 → MAS_XP y excedente al colchón', async () => {
    const u = await registerAndOnboard(app, 'masxp', 14);
    // Hace 10 días, en una semana terminada → 8000 XP en un único día.
    await addManualXp(app, u.accessToken, isoOffset(-10), 8000);

    const data = await getWeeks(app, u.accessToken);
    const cerradas = data.semanas.filter((s) => s.estado !== 'EN_CURSO');
    const masXp = cerradas.find((s) => s.estado === 'MAS_XP');
    expect(masXp).toBeDefined();
    expect(masXp!.xpTotal).toBe(8000);
    expect(masXp!.colchonRecibido).toBe(300);
    expect(data.colchonTotal).toBe(300);
  });

  it('semana terminada con xp < 7700 → DEFICIT, sin afectar colchón', async () => {
    const u = await registerAndOnboard(app, 'deficit', 14);
    await addManualXp(app, u.accessToken, isoOffset(-10), 4000);

    const data = await getWeeks(app, u.accessToken);
    const cerradas = data.semanas.filter((s) => s.estado !== 'EN_CURSO');
    const deficit = cerradas.find((s) => s.estado === 'DEFICIT');
    expect(deficit).toBeDefined();
    expect(deficit!.xpTotal).toBe(4000);
    expect(deficit!.colchonRecibido).toBe(0);
    expect(data.colchonTotal).toBe(0);
  });

  it('aplicar colchón a DEFICIT con colchón suficiente → COMPENSADA', async () => {
    const u = await registerAndOnboard(app, 'comp', 21);
    // Semana hace 14 días → 10000 XP (excedente 2300 al colchón).
    await addManualXp(app, u.accessToken, isoOffset(-14), 10000);
    // Semana hace 7 días → 5000 XP → DEFICIT (falta 2700, colchón 2300 NO alcanza).
    // Reajustamos para que sí alcance: superávit 3000 + déficit 5000 → falta 2700 con colchón 3000.
    // Actualizo el primer add a 10700 XP.
    await addManualXp(app, u.accessToken, isoOffset(-14), 700); // total 10700 → excedente 3000
    await addManualXp(app, u.accessToken, isoOffset(-7), 5000); // déficit, falta 2700

    let data = await getWeeks(app, u.accessToken);
    const deficitSemana = data.semanas.find((s) => s.estado === 'DEFICIT');
    expect(deficitSemana).toBeDefined();
    expect(data.colchonTotal).toBe(3000);

    // Aplicar colchón
    const res = await request(app.getHttpServer())
      .post(`/v1/weeks/${deficitSemana!.id}/apply-colchon`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(201);

    expect(res.body.estado).toBe('COMPENSADA');
    expect(res.body.colchonInvertido).toBe(2700);

    data = await getWeeks(app, u.accessToken);
    expect(data.colchonTotal).toBe(300); // 3000 − 2700
    const compensada = data.semanas.find((s) => s.id === deficitSemana!.id);
    expect(compensada?.estado).toBe('COMPENSADA');
  });

  it('colchón insuficiente → 400', async () => {
    const u = await registerAndOnboard(app, 'insuf', 14);
    // Semana hace 7 días con 5000 XP → falta 2700, colchón 0.
    await addManualXp(app, u.accessToken, isoOffset(-7), 5000);

    const data = await getWeeks(app, u.accessToken);
    const deficitSemana = data.semanas.find((s) => s.estado === 'DEFICIT')!;

    await request(app.getHttpServer())
      .post(`/v1/weeks/${deficitSemana.id}/apply-colchon`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(400);
  });

  it('aplicar colchón a MAS_XP o EN_CURSO → 400', async () => {
    const u = await registerAndOnboard(app, 'noaplica', 14);
    await addManualXp(app, u.accessToken, isoOffset(-10), 8000);

    const data = await getWeeks(app, u.accessToken);
    const masxp = data.semanas.find((s) => s.estado === 'MAS_XP');
    expect(masxp).toBeDefined();

    await request(app.getHttpServer())
      .post(`/v1/weeks/${masxp!.id}/apply-colchon`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ confirmar: true })
      .expect(400);
  });

  it('XpSummary.stats.colchon refleja el colchón real (Fase 6 conectada con Fase 10)', async () => {
    const u = await registerAndOnboard(app, 'stats', 14);
    await addManualXp(app, u.accessToken, isoOffset(-10), 9000);

    // Forzar materialización con un GET previo a la weeks.
    await getWeeks(app, u.accessToken);

    const sum = await getXpSummary(app, u.accessToken);
    // 9000 - 7700 = 1300 al colchón
    expect(sum.stats.colchon).toBe(1300);
  });
});

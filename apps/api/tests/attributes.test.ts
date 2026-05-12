/**
 * Tests integración de /v1/attributes y /v1/attributes/:code/increment.
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 *
 * Cubren:
 *  - GET inicial: 9 atributos en valor 0, modos correctos.
 *  - POST FUE incrementa +1 y bloquea otro +1 mismo día.
 *  - POST HID rechazado (400 — es AUTO).
 *  - POST PRO sin value → 400; con value 0..3 actualiza
 *    daily_entry.productividad y refleja en attribute_log.
 *  - PRO sobrescribe valor anterior (declarar dos veces el día).
 *  - HID se incrementa automáticamente al cumplir meta hidratación.
 *  - Total = SUM(valor) de los 9.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AttributesSummary } from '@perdida-peso/schemas';
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
  const email = `attrs-${suffix}-${Date.now()}@test.local`;
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

async function getAttrs(
  app: INestApplication,
  token: string,
): Promise<AttributesSummary> {
  const res = await request(app.getHttpServer())
    .get('/v1/attributes')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return res.body as AttributesSummary;
}

describe('attributes', () => {
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

  it('usuario nuevo → 9 atributos en 0 con modos correctos', async () => {
    const u = await registerAndOnboard(app, 'fresh');
    const data = await getAttrs(app, u.accessToken);

    expect(data.atributos).toHaveLength(9);
    const codes = data.atributos.map((a) => a.code);
    expect(codes).toEqual(['FUE', 'VIT', 'DES', 'INT', 'CRE', 'ESP', 'CAR', 'HID', 'PRO']);
    for (const a of data.atributos) {
      expect(a.valor).toBe(0);
      expect(a.alcanzadoHoy).toBe(false);
    }
    expect(data.atributos.find((a) => a.code === 'HID')?.modo).toBe('AUTO_HIDRATACION');
    expect(data.atributos.find((a) => a.code === 'PRO')?.modo).toBe('AUTO_PRODUCTIVIDAD');
    expect(data.atributos.find((a) => a.code === 'FUE')?.modo).toBe('MANUAL');
    expect(data.total).toBe(0);
  });

  it('+1 FUE incrementa el valor y bloquea otro +1 el mismo día', async () => {
    const u = await registerAndOnboard(app, 'fue');
    const fecha = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/v1/attributes/FUE/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, descripcion: 'Gym 60min' })
      .expect(201);

    const data = await getAttrs(app, u.accessToken);
    const fue = data.atributos.find((a) => a.code === 'FUE')!;
    expect(fue.valor).toBe(1);
    expect(fue.alcanzadoHoy).toBe(true);

    // Segundo intento → 400.
    await request(app.getHttpServer())
      .post('/v1/attributes/FUE/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, descripcion: 'Repetido' })
      .expect(400);
  });

  it('HID rechaza incremento manual (400)', async () => {
    const u = await registerAndOnboard(app, 'hid-reject');
    await request(app.getHttpServer())
      .post('/v1/attributes/HID/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha: new Date().toISOString().slice(0, 10) })
      .expect(400);
  });

  it('PRO sin `value` → 400', async () => {
    const u = await registerAndOnboard(app, 'pro-no-value');
    await request(app.getHttpServer())
      .post('/v1/attributes/PRO/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha: new Date().toISOString().slice(0, 10) })
      .expect(400);
  });

  it('PRO con value 2 → daily_entry.productividad=2 y attribute_log con delta 2', async () => {
    const u = await registerAndOnboard(app, 'pro-2');
    const fecha = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/v1/attributes/PRO/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, value: 2 })
      .expect(201);

    const data = await getAttrs(app, u.accessToken);
    const pro = data.atributos.find((a) => a.code === 'PRO')!;
    expect(pro.valor).toBe(2);
    expect(pro.productividadHoy).toBe(2);
    expect(pro.alcanzadoHoy).toBe(true);

    // Verificamos que el daily_entry refleja la productividad.
    const entry = await request(app.getHttpServer())
      .get(`/v1/entries/${fecha}`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);
    expect(entry.body.productividad).toBe(2);
  });

  it('PRO sobrescribe el valor anterior (mismo día)', async () => {
    const u = await registerAndOnboard(app, 'pro-overwrite');
    const fecha = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/v1/attributes/PRO/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, value: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/attributes/PRO/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, value: 3 })
      .expect(201);

    const data = await getAttrs(app, u.accessToken);
    const pro = data.atributos.find((a) => a.code === 'PRO')!;
    // Total acumulado = 3 (no 1+3); el primero se borra al sincronizar.
    expect(pro.valor).toBe(3);
    expect(pro.productividadHoy).toBe(3);
  });

  it('PRO con value 0 → no genera attribute_log (terrible = sin punto)', async () => {
    const u = await registerAndOnboard(app, 'pro-zero');
    const fecha = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/v1/attributes/PRO/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, value: 0 })
      .expect(201);

    const data = await getAttrs(app, u.accessToken);
    const pro = data.atributos.find((a) => a.code === 'PRO')!;
    expect(pro.valor).toBe(0);
    expect(pro.productividadHoy).toBe(0);
    // alcanzadoHoy false porque el SUM del día es 0
    expect(pro.alcanzadoHoy).toBe(false);
  });

  it('cumplir meta hidratación → +1 a HID en el resumen de atributos', async () => {
    const u = await registerAndOnboard(app, 'hid-auto');
    const fecha = new Date().toISOString().slice(0, 10);

    // Sin agua → HID = 0.
    let data = await getAttrs(app, u.accessToken);
    expect(data.atributos.find((a) => a.code === 'HID')?.valor).toBe(0);

    // 2L agua + sodio 0 → meta cumplida.
    await request(app.getHttpServer())
      .put(`/v1/entries/${fecha}`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ aguaL: 2 })
      .expect(200);

    data = await getAttrs(app, u.accessToken);
    const hid = data.atributos.find((a) => a.code === 'HID')!;
    expect(hid.valor).toBe(1);
    expect(hid.alcanzadoHoy).toBe(true);

    // Bajar agua → HID se retira.
    await request(app.getHttpServer())
      .put(`/v1/entries/${fecha}`)
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ aguaL: 1 })
      .expect(200);

    data = await getAttrs(app, u.accessToken);
    expect(data.atributos.find((a) => a.code === 'HID')?.valor).toBe(0);
  });

  it('total = SUM de todos los valores', async () => {
    const u = await registerAndOnboard(app, 'total');
    const fecha = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/v1/attributes/FUE/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/attributes/CRE/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/attributes/PRO/increment')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ fecha, value: 3 })
      .expect(201);

    const data = await getAttrs(app, u.accessToken);
    expect(data.total).toBe(1 + 1 + 3);
  });
});

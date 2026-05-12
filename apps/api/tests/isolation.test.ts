/**
 * Tests de aislamiento multi-tenant.
 *
 * REQUIERE Postgres corriendo y la migración aplicada.
 *
 * Antes de ejecutar:
 *   docker compose up -d db
 *   pnpm db:migrate
 *   pnpm --filter @perdida-peso/api test
 *
 * Cada test usa el server NestJS levantado in-process y dos usuarios
 * distintos. Verifica que el usuario A NO puede leer ni manipular los
 * datos del usuario B, ni siquiera adivinando IDs.
 *
 * NOTA: estos tests dejan datos en la BBDD. Para CI conviene:
 *   - usar una DB separada (`perdida_peso_test`),
 *   - limpiar tablas con TRUNCATE antes de la suite,
 *   - o levantar testcontainers con un Postgres efímero.
 *
 * Esta primera versión usa la DATABASE_URL del env. La integración con
 * testcontainers se hará cuando la suite crezca.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

interface UserCtx {
  email: string;
  password: string;
  accessToken: string;
}

async function registerUser(app: INestApplication, suffix: string): Promise<UserCtx> {
  const email = `iso-${suffix}-${Date.now()}@test.local`;
  const password = 'TestPassword123!';

  const res = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password });

  if (res.status !== 201) {
    throw new Error(`Register falló: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { email, password, accessToken: res.body.accessToken as string };
}

describe('aislamiento multi-tenant', () => {
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

  it('el usuario A no ve los pesos del usuario B', async () => {
    const a = await registerUser(app, 'a');
    const b = await registerUser(app, 'b');

    // B inserta un peso
    await request(app.getHttpServer())
      .put('/v1/weights')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ fecha: '2026-05-01', pesoKg: 80 })
      .expect(200);

    // A pide su lista — debe estar vacía
    const list = await request(app.getHttpServer())
      .get('/v1/weights')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    expect(list.body).toEqual([]);
  });

  it('el usuario A no puede borrar pesos del usuario B', async () => {
    const a = await registerUser(app, 'a-del');
    const b = await registerUser(app, 'b-del');

    await request(app.getHttpServer())
      .put('/v1/weights')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ fecha: '2026-05-02', pesoKg: 81 })
      .expect(200);

    // A intenta borrar el peso del 2026-05-02 → no afecta a B
    await request(app.getHttpServer())
      .delete('/v1/weights/2026-05-02')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(204);

    // B ve su peso intacto
    const bList = await request(app.getHttpServer())
      .get('/v1/weights')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);
    expect(bList.body).toHaveLength(1);
    expect(bList.body[0].pesoKg).toBe(81);
  });

  it('rechaza requests sin Authorization', async () => {
    await request(app.getHttpServer()).get('/v1/weights').expect(401);
    await request(app.getHttpServer()).put('/v1/weights').send({}).expect(401);
    await request(app.getHttpServer()).get('/v1/users/me/profile').expect(401);
  });

  it('un access token con sesión revocada deja de funcionar tras logout', async () => {
    const u = await registerUser(app, 'logout');

    await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(401);
  });

  it('el endpoint /health es público (sin token)', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});

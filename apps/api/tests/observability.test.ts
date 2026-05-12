/**
 * Tests integración de observabilidad (Fase 18 mínima):
 *   - /health/live público y sin deps
 *   - /health/ready con check de BBDD
 *   - /metrics expone counters de Prometheus
 *
 * REQUIERE Postgres corriendo y migraciones aplicadas.
 */

import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Observability (Fase 18)', () => {
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

  describe('Health probes', () => {
    it('/health/live → 200 sin auth', async () => {
      const res = await request(app.getHttpServer()).get('/health/live').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('/health/ready → 200 con BBDD ok', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info?.database?.status).toBe('up');
    });

    it('/health (compat) → 200', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });
  });

  describe('Métricas Prometheus', () => {
    it('/metrics expone formato text/plain con default metrics', async () => {
      const res = await request(app.getHttpServer()).get('/metrics').expect(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      // Default metrics expuestas por prom-client.
      expect(res.text).toMatch(/process_cpu_user_seconds_total/);
      expect(res.text).toMatch(/nodejs_eventloop_lag_seconds/);
    });

    it('/metrics incluye los counters custom registrados', async () => {
      const res = await request(app.getHttpServer()).get('/metrics').expect(200);
      expect(res.text).toContain('pp_signups_total');
      expect(res.text).toContain('pp_logins_total');
      expect(res.text).toContain('pp_http_request_duration_seconds');
    });

    it('histogram HTTP registra muestras tras peticiones reales', async () => {
      // Genera al menos una request observada.
      await request(app.getHttpServer()).get('/health').expect(200);
      // No, /health se omite. Hacemos algo que SÍ se mida: 401 en endpoint protegido.
      await request(app.getHttpServer()).get('/v1/auth/me').expect(401);

      const res = await request(app.getHttpServer()).get('/metrics').expect(200);
      // Al menos un sample del histogram debe aparecer (las peticiones HTTP las cuenta el interceptor).
      expect(res.text).toMatch(/pp_http_request_duration_seconds_count\{[^}]*\}\s+\d+/);
    });
  });
});

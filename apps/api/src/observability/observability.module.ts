import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from './http-metrics.interceptor.js';

/**
 * Métricas custom de la app (Fase 18). Histograms para latencia HTTP,
 * counters para eventos de negocio (signups, logins, etc.).
 *
 * Los providers se registran con `@willsoto/nestjs-prometheus`. El
 * `PrometheusModule` global ya expone `/metrics`.
 */
@Module({
  providers: [
    makeHistogramProvider({
      name: 'pp_http_request_duration_seconds',
      help: 'Duración de las peticiones HTTP en segundos.',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeCounterProvider({
      name: 'pp_signups_total',
      help: 'Total de registros nuevos.',
    }),
    makeCounterProvider({
      name: 'pp_logins_total',
      help: 'Total de intentos de login agrupados por resultado.',
      labelNames: ['result'],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class ObservabilityModule {}

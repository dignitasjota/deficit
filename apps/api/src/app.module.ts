import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { AttributesModule } from './attributes/attributes.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import { ChartsModule } from './charts/charts.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './db/database.module.js';
import { EntriesModule } from './entries/entries.module.js';
import { HealthModule } from './health/health.module.js';
import { LegalModule } from './legal/legal.module.js';
import { MailerModule } from './mailer/mailer.module.js';
import { ObservabilityModule } from './observability/observability.module.js';
import { PathModule } from './path/path.module.js';
import { UsersModule } from './users/users.module.js';
import { WeeksModule } from './weeks/weeks.module.js';
import { WeightsModule } from './weights/weights.module.js';
import { XpModule } from './xp/xp.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname,req,res,responseTime',
                  messageFormat: '{msg} [{req.method} {req.url}]',
                },
              }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req: (req: { id: string; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
    ScheduleModule.forRoot(),
    /**
     * Cache en memoria global. TTL default 60s. Aplicable manualmente
     * vía `cacheManager.wrap()` en services concretos donde la
     * latencia merezca el coste (ej. AdminService.getMetrics).
     */
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
      max: 1000,
    }),
    /**
     * Métricas Prometheus expuestas en `/metrics`. Default metrics
     * (process, GC, event loop) + histogramas y counters custom
     * registrados desde otros módulos.
     */
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      defaultLabels: { app: 'perdida-peso-api' },
    }),
    AppConfigModule,
    ObservabilityModule,
    DatabaseModule,
    MailerModule,
    AdminModule,
    AuthModule,
    BillingModule,
    LegalModule,
    UsersModule,
    WeightsModule,
    EntriesModule,
    AttributesModule,
    WeeksModule,
    XpModule,
    ChartsModule,
    PathModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}

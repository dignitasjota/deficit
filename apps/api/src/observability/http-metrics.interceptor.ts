import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Request, Response } from 'express';
import type { Histogram } from 'prom-client';
import { type Observable, tap } from 'rxjs';

/**
 * Mide la duración de cada request HTTP y la registra en el histogram
 * `pp_http_request_duration_seconds` con labels method/route/status.
 *
 * `route` viene del path templado (`/v1/users/:id`), no de la URL real
 * con parámetros — para evitar cardinalidad explosiva en Prometheus.
 *
 * Las rutas operacionales (`/metrics`, `/health/*`) se omiten para no
 * "contaminar" el histograma con scraping del propio Prometheus.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('pp_http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (this.shouldSkip(req.path)) {
      return next.handle();
    }
    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        next: () => this.observe(ctx, req, start),
        error: () => this.observe(ctx, req, start),
      }),
    );
  }

  private observe(ctx: ExecutionContext, req: Request, start: bigint): void {
    const res = ctx.switchToHttp().getResponse<Response>();
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
    this.histogram.observe(
      { method: req.method, route, status: String(res.statusCode) },
      durationSec,
    );
  }

  private shouldSkip(path: string | undefined): boolean {
    if (!path) return false;
    return path === '/metrics' || path.startsWith('/health');
  }
}

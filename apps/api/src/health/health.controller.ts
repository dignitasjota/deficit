import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../auth/public.decorator.js';
import { DatabaseHealthIndicator } from './database.health.js';

@ApiTags('health')
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check completo (compat). Equivalente a /health/ready.' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe: el proceso responde. Sin chequear dependencias externas.',
  })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe: dependencias críticas (BBDD) operativas. Si falla, el balanceador debería retirar este pod.',
  })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }
}

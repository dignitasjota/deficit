import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DashboardHeader } from '@perdida-peso/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiBearerAuth()
@ApiTags('dashboard')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('header')
  @ApiOperation({
    summary:
      'Snapshot del header del dashboard: peso del día, media 7d, peso teórico, rango esperado con desglose y badge dentro/fuera.',
  })
  getHeader(@CurrentUser('id') userId: string): Promise<DashboardHeader> {
    return this.dashboard.getHeader(userId);
  }
}

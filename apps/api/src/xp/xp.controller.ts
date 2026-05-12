import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type LogPageQuery,
  logPageQuerySchema,
  type ManualXpInput,
  manualXpInputSchema,
  type XpLogPage,
  type XpSummary,
} from '@perdida-peso/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { XpService } from './xp.service.js';

@ApiBearerAuth()
@ApiTags('xp')
@Controller({ path: 'xp', version: '1' })
export class XpController {
  constructor(private readonly xp: XpService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Resumen de progresión: xpTotal, nivel actual, próximo hito, camino L0→L80 y stats agregados.',
  })
  getSummary(@CurrentUser('id') userId: string): Promise<XpSummary> {
    return this.xp.getSummary(userId);
  }

  @Get('log')
  @ApiOperation({
    summary: 'Bitácora paginada por cursor (DESC por created_at, id).',
  })
  getLog(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(logPageQuerySchema)) query: LogPageQuery,
  ): Promise<XpLogPage> {
    return this.xp.getLog(userId, query);
  }

  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Introduce una entrada manual de XP (tipo `M` en la bitácora).',
  })
  addManual(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(manualXpInputSchema)) input: ManualXpInput,
  ): Promise<{ id: string; xp: number }> {
    return this.xp.addManual(userId, input);
  }
}

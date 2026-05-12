import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type ApplyColchonInput,
  applyColchonInputSchema,
  type WeekStatus,
  type WeeksSummary,
} from '@perdida-peso/schemas';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequiresPlan } from '../billing/requires-plan.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { WeeksService } from './weeks.service.js';

const uuidSchema = z.string().uuid();

@ApiBearerAuth()
@ApiTags('weeks')
@RequiresPlan('premium')
@Controller({ path: 'weeks', version: '1' })
export class WeeksController {
  constructor(private readonly weeks: WeeksService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista cronológica DESC de semanas (lun-dom) con xp_total, estado y colchón. Materializa al vuelo las semanas terminadas no presentes en BBDD.',
  })
  getAll(@CurrentUser('id') userId: string): Promise<WeeksSummary> {
    return this.weeks.getAll(userId);
  }

  @Post(':id/apply-colchon')
  @ApiOperation({
    summary: 'Invierte colchón en una semana DEFICIT para compensarla → COMPENSADA.',
  })
  applyColchon(
    @CurrentUser('id') userId: string,
    @Param('id', new ZodValidationPipe(uuidSchema)) weekId: string,
    @Body(new ZodValidationPipe(applyColchonInputSchema)) _body: ApplyColchonInput,
  ): Promise<WeekStatus> {
    return this.weeks.applyColchon(userId, weekId);
  }
}

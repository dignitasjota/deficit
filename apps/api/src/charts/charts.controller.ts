import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type WeightChartRange,
  type WeightChartResponse,
  weightChartRangeSchema,
} from '@perdida-peso/schemas';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequiresPlan } from '../billing/requires-plan.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ChartsService } from './charts.service.js';

const queryShape = z.object({
  range: weightChartRangeSchema.default('30d'),
});

@ApiBearerAuth()
@ApiTags('charts')
@RequiresPlan('premium')
@Controller({ path: 'charts', version: '1' })
export class ChartsController {
  constructor(private readonly charts: ChartsService) {}

  @Get('weight')
  @ApiOperation({
    summary:
      'Serie temporal del peso: peso real, media móvil 7d, peso teórico (xpAcum/7700) y rango esperado por día.',
  })
  getWeightChart(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(queryShape)) query: { range: WeightChartRange },
  ): Promise<WeightChartResponse> {
    return this.charts.getWeightChart(userId, query.range);
  }
}

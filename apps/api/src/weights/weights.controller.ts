import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type DailyWeight,
  type DailyWeightInput,
  dailyWeightInputSchema,
  type DailyWeightListInput,
  dailyWeightListInputSchema,
  isoDateSchema,
} from '@perdida-peso/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { WeightsService } from './weights.service.js';

@ApiBearerAuth()
@ApiTags('weights')
@Controller({ path: 'weights', version: '1' })
export class WeightsController {
  constructor(private readonly weights: WeightsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los pesos del usuario en un rango de fechas' })
  list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(dailyWeightListInputSchema))
    filter: DailyWeightListInput,
  ): Promise<DailyWeight[]> {
    return this.weights.list(userId, filter);
  }

  @Put()
  @ApiOperation({ summary: 'Crea o actualiza el peso del día (idempotente por fecha)' })
  upsert(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(dailyWeightInputSchema)) input: DailyWeightInput,
  ): Promise<DailyWeight> {
    return this.weights.upsert(userId, input);
  }

  @Delete(':fecha')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borra el peso de una fecha (YYYY-MM-DD)' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('fecha', new ZodValidationPipe(isoDateSchema)) fecha: string,
  ): Promise<void> {
    await this.weights.deleteByDate(userId, fecha);
  }
}

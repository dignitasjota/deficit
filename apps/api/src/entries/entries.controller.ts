import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type DailyEntry,
  type DailyEntryInput,
  dailyEntryInputSchema,
  type ExerciseLog,
  type ExerciseLogInput,
  exerciseLogInputSchema,
  isoDateSchema,
} from '@perdida-peso/schemas';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { EntriesService } from './entries.service.js';

const uuidSchema = z.string().uuid();

@ApiBearerAuth()
@ApiTags('entries')
@Controller({ path: 'entries', version: '1' })
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Get(':fecha')
  @ApiOperation({
    summary:
      'Devuelve la entrada diaria del usuario para esa fecha (pasos, kcal, sodio, hidratación).',
  })
  get(
    @CurrentUser('id') userId: string,
    @Param('fecha', new ZodValidationPipe(isoDateSchema)) fecha: string,
  ): Promise<DailyEntry> {
    return this.entries.get(userId, fecha);
  }

  @Put(':fecha')
  @ApiOperation({
    summary:
      'Crea o actualiza la entrada diaria. Recalcula y reescribe xp_log (P, C) y attribute_log (HID).',
  })
  upsert(
    @CurrentUser('id') userId: string,
    @Param('fecha', new ZodValidationPipe(isoDateSchema)) fecha: string,
    @Body(new ZodValidationPipe(dailyEntryInputSchema)) input: DailyEntryInput,
  ): Promise<DailyEntry> {
    return this.entries.upsert(userId, fecha, input);
  }

  @Get(':fecha/exercise')
  @ApiOperation({ summary: 'Lista los ejercicios y caminatas de la fecha.' })
  listExercises(
    @CurrentUser('id') userId: string,
    @Param('fecha', new ZodValidationPipe(isoDateSchema)) fecha: string,
  ): Promise<ExerciseLog[]> {
    return this.entries.listExercises(userId, fecha);
  }

  @Post(':fecha/exercise')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Añade una sesión de ejercicio o caminata. La XP se calcula con el factor 0.7 (penalización ejercicio).',
  })
  addExercise(
    @CurrentUser('id') userId: string,
    @Param('fecha', new ZodValidationPipe(isoDateSchema)) fecha: string,
    @Body(new ZodValidationPipe(exerciseLogInputSchema)) input: ExerciseLogInput,
  ): Promise<ExerciseLog> {
    // Si el body trae fecha distinta del path, usamos la del path (consistencia URL).
    return this.entries.addExercise(userId, { ...input, fecha });
  }

  @Delete(':fecha/exercise/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una sesión de ejercicio. Reescribe xp_log L del día.' })
  async deleteExercise(
    @CurrentUser('id') userId: string,
    @Param('fecha', new ZodValidationPipe(isoDateSchema)) _fecha: string,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.entries.deleteExercise(userId, id);
  }
}

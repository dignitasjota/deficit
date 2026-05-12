import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  atributoCodigoSchema,
  type AttributeLogPage,
  type AttributeLogQuery,
  attributeLogQuerySchema,
  type AttributesSummary,
  type IncrementAttributeInput,
  incrementAttributeInputSchema,
} from '@perdida-peso/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AttributesService } from './attributes.service.js';

@ApiBearerAuth()
@ApiTags('attributes')
@Controller({ path: 'attributes', version: '1' })
export class AttributesController {
  constructor(private readonly attributes: AttributesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Devuelve los 9 atributos del usuario con valor acumulado, modo (AUTO/MANUAL) y si se ha alcanzado el +1 de hoy.',
  })
  getAll(@CurrentUser('id') userId: string): Promise<AttributesSummary> {
    return this.attributes.getAll(userId);
  }

  @Get('log')
  @ApiOperation({
    summary:
      'Registro de atributos paginado por cursor (DESC) con filtro opcional `atributo`.',
  })
  getLog(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(attributeLogQuerySchema)) query: AttributeLogQuery,
  ): Promise<AttributeLogPage> {
    return this.attributes.getLog(userId, query);
  }

  @Post(':code/increment')
  @ApiOperation({
    summary:
      'Incrementa el atributo. HID rechaza (es AUTO), PRO requiere `value` (0..3), resto suma +1 si no hay del día.',
  })
  increment(
    @CurrentUser('id') userId: string,
    @Param('code', new ZodValidationPipe(atributoCodigoSchema)) code: 'FUE' | 'VIT' | 'DES' | 'INT' | 'CRE' | 'ESP' | 'CAR' | 'HID' | 'PRO',
    @Body(new ZodValidationPipe(incrementAttributeInputSchema)) input: IncrementAttributeInput,
  ): Promise<{ valor: number; alcanzadoHoy: boolean }> {
    return this.attributes.increment(userId, code, input);
  }
}

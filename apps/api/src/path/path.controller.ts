import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BuyLevelInput,
  buyLevelInputSchema,
  type PathDestination,
} from '@perdida-peso/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequiresPlan } from '../billing/requires-plan.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PathService } from './path.service.js';

@ApiBearerAuth()
@ApiTags('path')
@RequiresPlan('premium')
@Controller({ path: 'path', version: '1' })
export class PathController {
  constructor(private readonly path: PathService) {}

  @Get('destination')
  @ApiOperation({
    summary:
      'Estado del camino L0→L80: nivel actual (naturales + comprados), KPIs, conseguidos, por venir y disponibilidad de compra.',
  })
  getDestination(@CurrentUser('id') userId: string): Promise<PathDestination> {
    return this.path.getDestination(userId);
  }

  @Post('buy-level')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Compra 1 nivel del camino con `xpPorNivel` del colchón. Falla con 400 si el colchón es insuficiente o si ya estás en L80.',
  })
  buyLevel(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(buyLevelInputSchema)) _body: BuyLevelInput,
  ): Promise<{ nivelComprado: number; nivelActual: number; colchonRestante: number }> {
    return this.path.buyLevel(userId);
  }
}

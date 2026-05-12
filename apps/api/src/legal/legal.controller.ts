import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AcceptConsentInput,
  acceptConsentInputSchema,
  type ConsentList,
  type ConsentRecord,
} from '@perdida-peso/schemas';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ConsentService } from './consent.service.js';

@ApiBearerAuth()
@ApiTags('legal')
@Controller({ path: 'consents', version: '1' })
export class LegalController {
  constructor(private readonly consents: ConsentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra la aceptación de un texto legal versionado.' })
  accept(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(acceptConsentInputSchema)) input: AcceptConsentInput,
    @Req() req: Request,
  ): Promise<ConsentRecord> {
    return this.consents.accept(
      userId,
      input.type,
      input.version,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Listado de consents aceptados por el usuario, DESC por fecha.' })
  async list(@CurrentUser('id') userId: string): Promise<ConsentList> {
    const consents = await this.consents.listForUser(userId);
    return { consents };
  }
}

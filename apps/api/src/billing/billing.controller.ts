import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BillingState,
  type BillingUrl,
  type CreateCheckoutInput,
  createCheckoutInputSchema,
} from '@perdida-peso/schemas';
import type { Request } from 'express';
import Stripe from 'stripe';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AppConfigService } from '../config/app-config.service.js';
import { BillingService } from './billing.service.js';

@ApiBearerAuth()
@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly config: AppConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Estado de facturación del usuario actual.' })
  getMyBilling(@CurrentUser('id') userId: string): Promise<BillingState> {
    return this.billing.getMyBilling(userId);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crea sesión de Stripe Checkout y devuelve la URL.' })
  async checkout(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createCheckoutInputSchema)) input: CreateCheckoutInput,
  ): Promise<BillingUrl> {
    const url = await this.billing.createCheckoutSession(userId, input.period);
    return { url };
  }

  @Post('portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crea sesión del Customer Portal y devuelve la URL.' })
  async portal(@CurrentUser('id') userId: string): Promise<BillingUrl> {
    const url = await this.billing.createPortalSession(userId);
    return { url };
  }

  @Public()
  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Endpoint de webhooks Stripe. Verifica firma con STRIPE_WEBHOOK_SECRET y procesa el evento.',
  })
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true; duplicate: boolean }> {
    const cfg = this.config.stripe;
    if (!cfg.enabled || !cfg.webhookSecret) {
      throw new BadRequestException('Webhook deshabilitado: STRIPE_WEBHOOK_SECRET sin definir.');
    }
    if (!signature) {
      throw new BadRequestException('Falta header stripe-signature.');
    }
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body no disponible. Verifica la configuración del raw parser para /v1/billing/webhooks.',
      );
    }
    const stripe = new Stripe(cfg.secretKey, { apiVersion: '2025-02-24.acacia' });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, cfg.webhookSecret);
    } catch (err) {
      this.logger.warn(`Firma inválida: ${(err as Error).message}`);
      throw new BadRequestException('Firma de webhook inválida.');
    }

    const result = await this.billing.handleWebhookEvent(event);
    return { received: true, duplicate: result.duplicate };
  }
}

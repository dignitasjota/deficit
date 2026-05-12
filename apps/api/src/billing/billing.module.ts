import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { PlanGuard } from './plan.guard.js';

@Module({
  providers: [
    BillingService,
    {
      provide: APP_GUARD,
      useClass: PlanGuard,
    },
  ],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}

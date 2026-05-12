import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailTokensService } from './email-tokens.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PurgeService } from './purge.service.js';

@Module({
  providers: [
    AuthService,
    EmailTokensService,
    PurgeService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, EmailTokensService],
})
export class AuthModule {}

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type DeleteAccountInput,
  deleteAccountInputSchema,
  loginInputSchema,
  type LoginInput,
  type Me,
  refreshInputSchema,
  type RefreshInput,
  registerInputSchema,
  type RegisterInput,
  type RequestPasswordResetInput,
  requestPasswordResetInputSchema,
  type ResetPasswordInput,
  resetPasswordInputSchema,
  type TokenInput,
  tokenInputSchema,
  type TokenPair,
} from '@perdida-peso/schemas';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { Inject } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { DATABASE, type Database } from '../db/database.module.js';
import { userProfile } from '../db/schema/user_profile.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Crear una cuenta nueva' })
  register(
    @Body(new ZodValidationPipe(registerInputSchema)) input: RegisterInput,
    @Req() req: Request,
  ): Promise<TokenPair> {
    return this.auth.register({
      email: input.email,
      password: input.password,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  login(
    @Body(new ZodValidationPipe(loginInputSchema)) input: LoginInput,
    @Req() req: Request,
  ): Promise<TokenPair> {
    return this.auth.login({
      email: input.email,
      password: input.password,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar el access token usando el refresh token' })
  refresh(
    @Body(new ZodValidationPipe(refreshInputSchema)) input: RefreshInput,
  ): Promise<TokenPair> {
    return this.auth.refresh(input.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar la sesión actual' })
  async logout(@CurrentUser('sessionId') sessionId: string): Promise<void> {
    await this.auth.logout(sessionId);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Datos del usuario autenticado' })
  async me(@CurrentUser('id') userId: string): Promise<Me> {
    const me = await this.auth.getMe(userId);
    if (!me) {
      throw new Error('Usuario autenticado pero no encontrado en BBDD');
    }

    const [profile] = await this.db
      .select({ userId: userProfile.userId })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);

    return {
      ...me,
      hasProfile: profile !== undefined,
    };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Consume un token de verificación de email' })
  async verifyEmail(
    @Body(new ZodValidationPipe(tokenInputSchema)) input: TokenInput,
  ): Promise<void> {
    await this.auth.verifyEmail(input.token);
  }

  @ApiBearerAuth()
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reenvía el email de verificación al usuario autenticado' })
  async resendVerification(@CurrentUser('id') userId: string): Promise<void> {
    await this.auth.resendVerification(userId);
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Solicita un email de recuperación. Devuelve 204 siempre (no revela si el email existe).',
  })
  async requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetInputSchema))
    input: RequestPasswordResetInput,
  ): Promise<void> {
    await this.auth.requestPasswordReset(input.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambia la contraseña usando un token de reset' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordInputSchema)) input: ResetPasswordInput,
  ): Promise<void> {
    await this.auth.resetPassword(input.token, input.newPassword);
  }

  @ApiBearerAuth()
  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Marca la cuenta para borrado tras un período de gracia. Requiere la contraseña actual.',
  })
  async deleteAccount(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(deleteAccountInputSchema)) input: DeleteAccountInput,
  ): Promise<{ purgeScheduledAt: string }> {
    return this.auth.deleteAccount(userId, input.password);
  }
}



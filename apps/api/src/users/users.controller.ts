import { Body, Controller, Get, Header, NotFoundException, Put, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type UpdateAvatarInput,
  updateAvatarInputSchema,
  type UpdateThemeInput,
  updateThemeInputSchema,
  type UserProfile,
  type UserProfileInput,
  userProfileInputSchema,
} from '@perdida-peso/schemas';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequiresPlan } from '../billing/requires-plan.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ExportService } from '../legal/export.service.js';
import { UsersService } from './users.service.js';

@ApiBearerAuth()
@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly exporter: ExportService,
  ) {}

  @Get('me/profile')
  @ApiOperation({ summary: 'Devuelve el perfil del usuario autenticado y los derivados de progresión' })
  async getMyProfile(@CurrentUser('id') userId: string): Promise<UserProfile> {
    const profile = await this.users.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('El usuario aún no tiene perfil. Completar onboarding.');
    }
    return profile;
  }

  @Put('me/profile')
  @ApiOperation({
    summary: 'Crea o actualiza el perfil. Cada actualización abre una nueva profile_version.',
  })
  upsertMyProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(userProfileInputSchema)) input: UserProfileInput,
  ): Promise<UserProfile> {
    return this.users.upsertProfile(userId, input);
  }

  @Put('me/avatar')
  @ApiOperation({ summary: 'Actualiza el avatar del usuario autenticado' })
  updateAvatar(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateAvatarInputSchema)) input: UpdateAvatarInput,
  ): Promise<{ avatarId: string }> {
    return this.auth.updateAvatar(userId, input.avatarId);
  }

  @Put('me/theme')
  @ApiOperation({
    summary:
      'Actualiza la skin/tema visual del usuario. Plumbing preparado para skins Premium futuras.',
  })
  updateTheme(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateThemeInputSchema)) input: UpdateThemeInput,
  ): Promise<{ themePreference: 'cyberpunk' }> {
    return this.auth.updateTheme(userId, input.themePreference);
  }

  @Get('me/export')
  @RequiresPlan('premium')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @ApiOperation({
    summary:
      'Export RGPD: descarga JSON con todos los datos personales del usuario.',
  })
  async exportMyData(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const data = await this.exporter.buildExport(userId);
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="perdida-peso-export-${fecha}.json"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(data, null, 2));
  }
}

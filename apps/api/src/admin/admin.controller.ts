import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AdminAuditPage,
  type AdminAuditQuery,
  adminAuditQuerySchema,
  type AdminMetrics,
  type AdminSuspendInput,
  adminSuspendInputSchema,
  type AdminUserDetail,
  type AdminUserListPage,
  type AdminUserListQuery,
  adminUserListQuerySchema,
  type ImpersonateOutput,
} from '@perdida-peso/schemas';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AdminGuard } from './admin.guard.js';
import { AdminOnly } from './admin-only.decorator.js';
import { AdminService } from './admin.service.js';

@ApiBearerAuth()
@ApiTags('admin')
@AdminOnly()
@UseGuards(AdminGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'KPIs globales: usuarios, activos, MRR, etc.' })
  getMetrics(): Promise<AdminMetrics> {
    return this.admin.getMetrics();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lista paginada (cursor) de usuarios con búsqueda por email.' })
  listUsers(
    @Query(new ZodValidationPipe(adminUserListQuerySchema)) query: AdminUserListQuery,
  ): Promise<AdminUserListPage> {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Detalle de un usuario.' })
  getUser(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetail> {
    return this.admin.getUserDetail(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspende al usuario, revoca sesiones, registra audit.' })
  suspend(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body(new ZodValidationPipe(adminSuspendInputSchema)) input: AdminSuspendInput,
    @Req() req: Request,
  ): Promise<{ suspendedAt: string }> {
    return this.admin.suspendUser(adminUserId, targetId, input.motivo, req.ip, req.headers['user-agent']);
  }

  @Post('users/:id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Levanta la suspensión del usuario.' })
  async restore(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.admin.restoreUser(adminUserId, targetId, req.ip, req.headers['user-agent']);
  }

  @Post('users/:id/impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Genera tokens de sesión del usuario target. Audita el evento.',
  })
  impersonate(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Req() req: Request,
  ): Promise<ImpersonateOutput> {
    return this.admin.impersonate(adminUserId, targetId, req.ip, req.headers['user-agent']);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Audit log paginado (cursor) DESC por fecha.' })
  listAudit(
    @Query(new ZodValidationPipe(adminAuditQuerySchema)) query: AdminAuditQuery,
  ): Promise<AdminAuditPage> {
    return this.admin.listAudit(query);
  }
}

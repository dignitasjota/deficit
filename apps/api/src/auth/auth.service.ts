import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type { TokenPair } from '@perdida-peso/schemas';
import { AppConfigService } from '../config/app-config.service.js';
import { DATABASE, type Database } from '../db/database.module.js';
import { authSessions } from '../db/schema/auth_sessions.js';
import { users } from '../db/schema/users.js';
import { MailerService } from '../mailer/mailer.service.js';
import {
  accountDeletedTemplate,
  passwordResetTemplate,
  verifyEmailTemplate,
} from '../mailer/templates.js';
import {
  JwtVerifyError,
  hashPassword,
  signJwt,
  verifyJwt,
  verifyPassword,
} from './crypto.js';
import { EmailTokensService } from './email-tokens.service.js';

export interface RegisterParams {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

export interface LoginParams {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly config: AppConfigService,
    private readonly mailer: MailerService,
    private readonly emailTokens: EmailTokensService,
  ) {}

  /**
   * Si `BOOTSTRAP_ADMIN_EMAIL` está definido, promueve ese usuario a
   * admin al arrancar. Idempotente: si el usuario no existe todavía
   * (aún no se ha registrado), loguea aviso. Si ya es admin, no hace
   * nada. Útil para Portainer: defines la env, te registras vía la
   * web, y al siguiente restart del stack ya eres admin.
   */
  async onModuleInit(): Promise<void> {
    const email = this.config.bootstrapAdminEmail;
    if (!email) return;
    try {
      const [user] = await this.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (!user) {
        this.logger.warn(
          `BOOTSTRAP_ADMIN_EMAIL=${email} pero el usuario aún no se ha registrado. Regístrate desde /register y reinicia.`,
        );
        return;
      }
      if (user.role === 'admin') {
        this.logger.log(`Bootstrap admin: ${email} ya es admin, sin cambios.`);
        return;
      }
      await this.db
        .update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.id, user.id));
      this.logger.log(`Bootstrap admin: ${email} promovido a admin (${user.id}).`);
    } catch (err) {
      this.logger.error('Bootstrap admin falló', err as Error);
    }
  }

  async register(params: RegisterParams): Promise<TokenPair> {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, params.email))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('Email ya registrado');
    }

    const passwordHash = await hashPassword(params.password);
    const trialDays = this.config.stripe.trialDays;
    const trialEndsAt =
      trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;
    const [user] = await this.db
      .insert(users)
      .values({ email: params.email, passwordHash, trialEndsAt })
      .returning({ id: users.id });

    if (!user) {
      throw new Error('No se pudo crear el usuario');
    }

    // Disparar email de verificación. No bloquea el flujo de registro.
    void this.sendVerificationEmail(user.id, params.email);

    return this.createSession(user.id, params.userAgent, params.ip);
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const { token } = await this.emailTokens.issue(userId, 'verify');
    const verifyUrl = `${this.config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const tpl = verifyEmailTemplate({ email, verifyUrl, expiresHours: 24 });
    await this.mailer.send({ to: email, ...tpl });
  }

  async resendVerification(userId: string): Promise<void> {
    const [user] = await this.db
      .select({ email: users.email, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new UnauthorizedException();
    if (user.emailVerifiedAt) {
      throw new BadRequestException('El email ya está verificado');
    }
    await this.sendVerificationEmail(userId, user.email);
  }

  async verifyEmail(token: string): Promise<void> {
    const consumed = await this.emailTokens.consume(token, 'verify');
    if (!consumed) {
      throw new BadRequestException('Token inválido o caducado');
    }
    await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, consumed.userId));
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Mensaje genérico al caller. Si el email no existe, no decimos
    // nada (evita enumeración de cuentas).
    const [user] = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    if (!user) {
      this.logger.log(`request-password-reset para email inexistente: ${email}`);
      return;
    }
    const { token } = await this.emailTokens.issue(user.id, 'reset');
    const resetUrl = `${this.config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const tpl = passwordResetTemplate({ resetUrl, expiresHours: 1 });
    await this.mailer.send({ to: user.email, ...tpl });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const consumed = await this.emailTokens.consume(token, 'reset');
    if (!consumed) {
      throw new BadRequestException('Token inválido o caducado');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, consumed.userId));
    // Por seguridad, revocar todas las sesiones existentes del usuario.
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, consumed.userId), isNull(authSessions.revokedAt)));
  }

  async deleteAccount(userId: string, password: string): Promise<{ purgeScheduledAt: string }> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new UnauthorizedException();
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Contraseña incorrecta');

    const now = new Date();
    const purgeScheduledAt = new Date(now.getTime() + this.config.purgeGraceMs);
    await this.db
      .update(users)
      .set({ deletedAt: now, purgeScheduledAt, updatedAt: now })
      .where(eq(users.id, userId));

    // Revocar sesiones para forzar logout en otros dispositivos.
    await this.db
      .update(authSessions)
      .set({ revokedAt: now })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));

    const tpl = accountDeletedTemplate({
      email: user.email,
      purgeDateIso: purgeScheduledAt.toISOString(),
      reactivateUrl: `${this.config.appUrl}/login`,
    });
    await this.mailer.send({ to: user.email, ...tpl });

    return { purgeScheduledAt: purgeScheduledAt.toISOString() };
  }

  async login(params: LoginParams): Promise<TokenPair> {
    const [user] = await this.db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        deletedAt: users.deletedAt,
        suspendedAt: users.suspendedAt,
      })
      .from(users)
      .where(and(eq(users.email, params.email), isNull(users.deletedAt)))
      .limit(1);

    // Mensaje genérico para evitar enumeración de emails
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await verifyPassword(params.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.suspendedAt) {
      throw new UnauthorizedException('Cuenta suspendida. Contacta con soporte.');
    }

    return this.createSession(user.id, params.userAgent, params.ip);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: ReturnType<typeof verifyJwt>;
    try {
      payload = verifyJwt(refreshToken, this.config.jwtSecret, 'refresh');
    } catch (e) {
      if (e instanceof JwtVerifyError) {
        throw new UnauthorizedException(`refresh token inválido: ${e.code}`);
      }
      throw e;
    }

    const [session] = await this.db
      .select({
        id: authSessions.id,
        userId: authSessions.userId,
        expiresAt: authSessions.expiresAt,
        revokedAt: authSessions.revokedAt,
      })
      .from(authSessions)
      .where(eq(authSessions.id, payload.sid))
      .limit(1);

    if (!session || session.revokedAt !== null || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesión revocada o expirada');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Token no coincide con la sesión');
    }

    await this.db
      .update(authSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(authSessions.id, session.id));

    return this.issueTokens(session.userId, session.id);
  }

  async logout(sessionId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
  }

  async getMe(userId: string): Promise<{
    id: string;
    email: string;
    avatarId: string | null;
    emailVerifiedAt: string | null;
    createdAt: string;
    role: 'user' | 'admin';
    plan: 'free' | 'premium';
    effectivePlan: 'free' | 'premium';
    trialEndsAt: string | null;
    themePreference: 'cyberpunk';
  } | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        avatarId: users.avatarId,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        role: users.role,
        plan: users.plan,
        trialEndsAt: users.trialEndsAt,
        themePreference: users.themePreference,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!row) return null;

    const trialActive = row.trialEndsAt !== null && row.trialEndsAt > new Date();
    const effectivePlan: 'free' | 'premium' =
      row.plan === 'premium' || trialActive ? 'premium' : 'free';

    return {
      id: row.id,
      email: row.email,
      avatarId: row.avatarId,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      role: row.role,
      plan: row.plan,
      effectivePlan,
      trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
      themePreference: row.themePreference,
    };
  }

  /**
   * Cambia la skin visual del usuario (plumbing para feature Premium).
   * Cuando se añadan skins extra de pago, se decorará el endpoint con
   * `@RequiresPlan('premium')` o se hará validación en este servicio.
   */
  async updateTheme(
    userId: string,
    themePreference: 'cyberpunk',
  ): Promise<{ themePreference: 'cyberpunk' }> {
    await this.db
      .update(users)
      .set({ themePreference, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { themePreference };
  }

  async updateAvatar(userId: string, avatarId: string): Promise<{ avatarId: string }> {
    await this.db
      .update(users)
      .set({ avatarId, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { avatarId };
  }

  private async createSession(userId: string, userAgent?: string, ip?: string): Promise<TokenPair> {
    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000);
    const [session] = await this.db
      .insert(authSessions)
      .values({
        userId,
        expiresAt,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      })
      .returning({ id: authSessions.id });

    if (!session) {
      throw new Error('No se pudo crear la sesión');
    }

    return this.issueTokens(userId, session.id);
  }

  private issueTokens(userId: string, sessionId: string): TokenPair {
    const accessTtl = this.config.accessTokenTtlSeconds;
    const refreshTtl = this.config.refreshTokenTtlSeconds;
    const now = Math.floor(Date.now() / 1000);

    const accessToken = signJwt(
      { sub: userId, sid: sessionId, typ: 'access', exp: now + accessTtl },
      this.config.jwtSecret,
    );
    const refreshToken = signJwt(
      { sub: userId, sid: sessionId, typ: 'refresh', exp: now + refreshTtl },
      this.config.jwtSecret,
    );

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** URL pública del frontend, usada para construir links en emails. */
  APP_URL: z.string().url().default('http://localhost:3000'),
  /** SMTP. En dev apunta al servicio mailpit del docker-compose. */
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_FROM: z.string().default('"Déficit" <noreply@perdida-peso.local>'),
  /** Días que esperamos antes de purgar definitivamente una cuenta marcada como deleted. */
  PURGE_GRACE_DAYS: z.coerce.number().int().positive().default(30),
  /**
   * Stripe (Fase 17). Cadenas vacías permiten que la API arranque en
   * dev sin claves; el módulo solo opera si hay clave secreta.
   */
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_MONTHLY: z.string().default(''),
  STRIPE_PRICE_YEARLY: z.string().default(''),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().nonnegative().default(14),
  /**
   * Si se define, el usuario con ese email se promueve a `admin` al
   * arrancar la API (idempotente). Pensado para bootstrap en Portainer
   * sin necesidad de comandos manuales.
   */
  BOOTSTRAP_ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

type Env = z.infer<typeof envSchema>;

@Injectable()
export class AppConfigService {
  private readonly env: Env;

  constructor(private readonly config: ConfigService) {
    const parsed = envSchema.safeParse({
      NODE_ENV: this.config.get('NODE_ENV'),
      PORT: this.config.get('PORT'),
      DATABASE_URL: this.config.get('DATABASE_URL'),
      CORS_ORIGINS: this.config.get('CORS_ORIGINS'),
      SWAGGER_ENABLED: this.config.get('SWAGGER_ENABLED'),
      LOG_LEVEL: this.config.get('LOG_LEVEL'),
      JWT_SECRET: this.config.get('JWT_SECRET'),
      ACCESS_TOKEN_TTL_MIN: this.config.get('ACCESS_TOKEN_TTL_MIN'),
      REFRESH_TOKEN_TTL_DAYS: this.config.get('REFRESH_TOKEN_TTL_DAYS'),
      APP_URL: this.config.get('APP_URL'),
      SMTP_HOST: this.config.get('SMTP_HOST'),
      SMTP_PORT: this.config.get('SMTP_PORT'),
      SMTP_USER: this.config.get('SMTP_USER'),
      SMTP_PASS: this.config.get('SMTP_PASS'),
      SMTP_SECURE: this.config.get('SMTP_SECURE'),
      SMTP_FROM: this.config.get('SMTP_FROM'),
      PURGE_GRACE_DAYS: this.config.get('PURGE_GRACE_DAYS'),
      STRIPE_SECRET_KEY: this.config.get('STRIPE_SECRET_KEY'),
      STRIPE_WEBHOOK_SECRET: this.config.get('STRIPE_WEBHOOK_SECRET'),
      STRIPE_PRICE_MONTHLY: this.config.get('STRIPE_PRICE_MONTHLY'),
      STRIPE_PRICE_YEARLY: this.config.get('STRIPE_PRICE_YEARLY'),
      STRIPE_TRIAL_DAYS: this.config.get('STRIPE_TRIAL_DAYS'),
      BOOTSTRAP_ADMIN_EMAIL: this.config.get('BOOTSTRAP_ADMIN_EMAIL'),
    });

    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
      throw new Error('Configuración inválida. Revisa tu .env');
    }

    this.env = parsed.data;
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.env.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get port(): number {
    return this.env.PORT;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',').map((s) => s.trim());
  }

  get swaggerEnabled(): boolean {
    return this.env.SWAGGER_ENABLED;
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.env.LOG_LEVEL;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get accessTokenTtlSeconds(): number {
    return this.env.ACCESS_TOKEN_TTL_MIN * 60;
  }

  get refreshTokenTtlSeconds(): number {
    return this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  }

  get appUrl(): string {
    return this.env.APP_URL.replace(/\/$/, '');
  }

  get smtp(): {
    host: string;
    port: number;
    secure: boolean;
    user: string | undefined;
    pass: string | undefined;
    from: string;
  } {
    return {
      host: this.env.SMTP_HOST,
      port: this.env.SMTP_PORT,
      secure: this.env.SMTP_SECURE,
      user: this.env.SMTP_USER,
      pass: this.env.SMTP_PASS,
      from: this.env.SMTP_FROM,
    };
  }

  get purgeGraceMs(): number {
    return this.env.PURGE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  }

  get bootstrapAdminEmail(): string | undefined {
    return this.env.BOOTSTRAP_ADMIN_EMAIL;
  }

  get stripe(): {
    secretKey: string;
    webhookSecret: string;
    priceMonthly: string;
    priceYearly: string;
    trialDays: number;
    enabled: boolean;
  } {
    const secretKey = this.env.STRIPE_SECRET_KEY;
    return {
      secretKey,
      webhookSecret: this.env.STRIPE_WEBHOOK_SECRET,
      priceMonthly: this.env.STRIPE_PRICE_MONTHLY,
      priceYearly: this.env.STRIPE_PRICE_YEARLY,
      trialDays: this.env.STRIPE_TRIAL_DAYS,
      enabled: secretKey.length > 0,
    };
  }
}

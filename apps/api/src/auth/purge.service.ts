import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, isNotNull, lte } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';
import { users } from '../db/schema/users.js';
import { EmailTokensService } from './email-tokens.service.js';

/**
 * Cron diaria de purga de cuentas marcadas para borrado.
 *
 * Borra **físicamente** los usuarios cuyo `purge_scheduled_at <= now()`.
 * El borrado en cascada (FK `ON DELETE CASCADE`) limpia daily_weight,
 * daily_entry, exercise_log, attribute_log, xp_log, weeks, milestones,
 * level_purchases, email_tokens, auth_sessions y user_profile.
 *
 * Idempotente: si no hay nada que borrar, no hace nada. Si la API
 * está parada un día, la siguiente ejecución limpia todo lo
 * pendiente.
 */
@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly emailTokens: EmailTokensService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeDeletedUsers(): Promise<void> {
    const now = new Date();
    const purged = await this.db
      .delete(users)
      .where(
        and(
          isNotNull(users.purgeScheduledAt),
          lte(users.purgeScheduledAt, now),
          isNotNull(users.deletedAt),
        ),
      )
      .returning({ id: users.id });

    if (purged.length > 0) {
      this.logger.log(`Purgados ${purged.length} usuarios marcados para borrado.`);
    }

    const tokens = await this.emailTokens.cleanup();
    if (tokens > 0) {
      this.logger.log(`Limpiados ${tokens} tokens de email caducados.`);
    }
  }

  /**
   * Disparable manualmente desde tests para forzar la purga sin
   * esperar al cron.
   */
  async runNow(): Promise<{ purgedUsers: number; cleanedTokens: number }> {
    const beforeUsers = await this.db
      .delete(users)
      .where(
        and(
          isNotNull(users.purgeScheduledAt),
          lte(users.purgeScheduledAt, new Date()),
          isNotNull(users.deletedAt),
        ),
      )
      .returning({ id: users.id });
    const cleanedTokens = await this.emailTokens.cleanup();
    return { purgedUsers: beforeUsers.length, cleanedTokens };
  }
}

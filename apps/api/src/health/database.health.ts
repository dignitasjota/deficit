import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/database.module.js';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
  }
}

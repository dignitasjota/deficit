import { Global, Module } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { AppConfigService } from '../config/app-config.service.js';
import * as schema from './schema/index.js';

export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Database => {
        const pool = new pg.Pool({
          connectionString: config.databaseUrl,
          max: 10,
          idleTimeoutMillis: 30_000,
        });
        return drizzle(pool, { schema, casing: 'snake_case' });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}

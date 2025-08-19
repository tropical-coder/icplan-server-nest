import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { appEnv } from '@app/common/helpers/env.helper';

export const config: TypeOrmModuleOptions = {
  type: 'postgres',
  host: appEnv('DB_POSTGRES_HOST'),
  port: Number(appEnv('DB_POSTGRES_PORT', 5432)),
  username: appEnv('DB_POSTGRES_USER', 'root'),
  password: appEnv('DB_POSTGRES_PASS', ''),
  database: appEnv('DB_POSTGRES_DB_NAME', ''),
  logging: ['error'], //["query", "error"],
  migrationsRun: false,
  entities: [path.join(__dirname, '../../../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/*.js')],
  synchronize: false, // Use migrations in prod
  extra: {
    max: appEnv('DB_POSTGRES_POOL_MAX', 10),
    ...(appEnv('DB_POSTGRES_HOST') != 'localhost' && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  },
  ...(appEnv('ENVIRONMENT') !== 'develop' && {
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync(
        path.join(__dirname, './rds-combined-ca-bundle.pem'),
      ),
    },
  }),
  retryAttempts: 3,
};

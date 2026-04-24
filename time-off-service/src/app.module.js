import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { EmployeeBalance } from './entities/employee-balance.entity';
import { TimeOffRequest } from './entities/time-off-request.entity';
import { AuditLog } from './entities/audit-log.entity';
import { OutboxEntry } from './entities/outbox-entry.entity';
import { BalancesModule } from './balances/balances.module';
import { TimeOffModule } from './time-off/time-off.module';
import { SyncModule } from './sync/sync.module';
import { AuditModule } from './audit/audit.module';
import { HealthController } from './health/health.controller';

function ensureDbDir(filePath) {
  if (!filePath || filePath === ':memory:') return;
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config) => {
        const configured = config.get('database.path');
        const isMemory = configured === ':memory:';
        const databasePath = isMemory
          ? ':memory:'
          : configured || join(process.cwd(), 'data', 'time-off.sqlite');
        if (!isMemory) ensureDbDir(databasePath);
        return {
          type: 'better-sqlite3',
          database: databasePath,
          synchronize: true,
          logging: process.env.TYPEORM_LOGGING === '1',
          entities: [EmployeeBalance, TimeOffRequest, AuditLog, OutboxEntry],
        };
      },
    }),
    BalancesModule,
    TimeOffModule,
    SyncModule,
    AuditModule,
  ],
  controllers: [HealthController],
})
class AppModule {}
export { AppModule };

import { Module } from '@nestjs/common';
import { BalancesModule } from '../balances/balances.module';
import { AuditModule } from '../audit/audit.module';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [BalancesModule, AuditModule],
  providers: [SyncService],
  controllers: [SyncController],
})
class SyncModule {}
export { SyncModule };

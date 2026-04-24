import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffRequest } from '../entities/time-off-request.entity';
import { TimeOffService } from './time-off.service';
import { TimeOffController } from './time-off.controller';
import { BalancesModule } from '../balances/balances.module';
import { HcmModule } from '../hcm/hcm.module';
import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeOffRequest]),
    BalancesModule,
    HcmModule,
    AuditModule,
    OutboxModule,
  ],
  providers: [TimeOffService],
  controllers: [TimeOffController],
  exports: [TimeOffService],
})
class TimeOffModule {}
export { TimeOffModule };

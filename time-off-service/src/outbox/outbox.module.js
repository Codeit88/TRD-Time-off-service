import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEntry } from '../entities/outbox-entry.entity';
import { OutboxService } from './outbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEntry])],
  providers: [OutboxService],
  exports: [OutboxService],
})
class OutboxModule {}
export { OutboxModule };

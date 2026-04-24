import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEntry } from '../entities/outbox-entry.entity';
import { OutboxStatus } from '../common/constants';

@Injectable()
class OutboxService {
  constructor(
    @InjectRepository(OutboxEntry)
    repo,
  ) {
    this.repo = repo;
  }

  async enqueue(operation, payload, correlationId) {
    const row = this.repo.create({
      operation,
      payload,
      status: OutboxStatus.PENDING,
      correlationId: correlationId ?? null,
    });
    return this.repo.save(row);
  }

  async markSent(id) {
    await this.repo.update(
      { id },
      { status: OutboxStatus.SENT, lastError: null },
    );
  }

  async markFailed(id, err, incrementAttempts = true) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) return;
    entry.status = OutboxStatus.FAILED;
    entry.lastError = err instanceof Error ? err.message : String(err);
    if (incrementAttempts) entry.attempts += 1;
    await this.repo.save(entry);
  }
}
export { OutboxService };

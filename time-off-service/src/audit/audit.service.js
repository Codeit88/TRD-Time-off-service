import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    repo,
  ) {
    this.repo = repo;
  }

  async record(action, entityType, entityId, payload, correlationId) {
    const row = this.repo.create({
      action,
      entityType,
      entityId,
      payload: payload ?? null,
      correlationId: correlationId ?? null,
    });
    return this.repo.save(row);
  }

  async listForEntity(entityType, entityId, limit = 50) {
    return this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
export { AuditService };

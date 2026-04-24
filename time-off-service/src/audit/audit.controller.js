import { Controller, Get, Inject, Query, NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
class AuditController {
  constructor(
    @Inject(AuditService)
    audit,
  ) {
    this.audit = audit;
  }

  @Get('trail')
  async trail(
    @Query('entityType') entityType,
    @Query('entityId') entityId,
  ) {
    if (!entityType || !entityId) {
      throw new NotFoundException('entityType and entityId required');
    }
    const rows = await this.audit.listForEntity(entityType, entityId);
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      payload: r.payload,
      correlationId: r.correlationId,
      createdAt: r.createdAt,
    }));
  }
}
export { AuditController };

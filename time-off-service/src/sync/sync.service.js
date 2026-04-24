import { Inject, Injectable } from '@nestjs/common';
import { BalancesService } from '../balances/balances.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants';

@Injectable()
class SyncService {
  constructor(
    @Inject(BalancesService)
    balances,
    @Inject(AuditService)
    audit,
  ) {
    this.balances = balances;
    this.audit = audit;
  }

  async ingestBatch(items, correlationId) {
    const applied = await this.balances.applyBatchRows(items);
    for (const r of applied) {
      if (r.drift) {
        await this.audit.record(
          AuditAction.BALANCE_DRIFT,
          'EmployeeBalance',
          `${r.employeeId}:${r.locationId}`,
          {
            message:
              'HCM reported fewer available days than we have reserved locally',
            balanceVersion: r.balanceVersion,
          },
          correlationId,
        );
      } else {
        await this.audit.record(
          AuditAction.BALANCE_UPSERT,
          'EmployeeBalance',
          `${r.employeeId}:${r.locationId}`,
          { balanceVersion: r.balanceVersion },
          correlationId,
        );
      }
    }
    return { applied };
  }
}
export { SyncService };

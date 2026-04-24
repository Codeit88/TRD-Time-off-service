import { Test } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { BalancesService } from '../balances/balances.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants';

describe('SyncService', () => {
  let service;
  let balances;
  let audit;

  beforeEach(async () => {
    balances = { applyBatchRows: jest.fn() };
    audit = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: BalancesService, useValue: balances },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(SyncService);
  });

  it('records drift audit when applyBatchRows reports drift', async () => {
    balances.applyBatchRows.mockResolvedValue([
      { employeeId: 'e1', locationId: 'l1', drift: true, balanceVersion: 3 },
    ]);

    const out = await service.ingestBatch(
      [{ employeeId: 'e1', locationId: 'l1', availableDays: 1 }],
      'corr-1',
    );

    expect(out.applied[0].drift).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      AuditAction.BALANCE_DRIFT,
      'EmployeeBalance',
      'e1:l1',
      expect.objectContaining({ balanceVersion: 3 }),
      'corr-1',
    );
  });

  it('records upsert audit when no drift', async () => {
    balances.applyBatchRows.mockResolvedValue([
      { employeeId: 'e1', locationId: 'l1', drift: false, balanceVersion: 2 },
    ]);

    await service.ingestBatch(
      [{ employeeId: 'e1', locationId: 'l1', availableDays: 10 }],
      null,
    );

    expect(audit.record).toHaveBeenCalledWith(
      AuditAction.BALANCE_UPSERT,
      'EmployeeBalance',
      'e1:l1',
      { balanceVersion: 2 },
      null,
    );
  });
});

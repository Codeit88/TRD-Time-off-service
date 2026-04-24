import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';

describe('AuditService', () => {
  it('record delegates to repository save', async () => {
    const saved = { id: 'x' };
    const repo = {
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(saved),
    };

    const mod = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();

    const svc = mod.get(AuditService);
    const out = await svc.record('ACTION', 'T', 'id1', { a: 1 }, 'c1');

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ACTION',
        entityType: 'T',
        entityId: 'id1',
        payload: { a: 1 },
        correlationId: 'c1',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(out).toBe(saved);
  });
});

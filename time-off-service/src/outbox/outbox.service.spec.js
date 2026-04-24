import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OutboxService } from './outbox.service';
import { OutboxEntry } from '../entities/outbox-entry.entity';
import { OutboxStatus } from '../common/constants';

describe('OutboxService', () => {
  let svc;
  let repo;

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => ({ ...x, id: 'ob-1' })),
      save: jest.fn((x) => Promise.resolve(x)),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: getRepositoryToken(OutboxEntry), useValue: repo },
      ],
    }).compile();

    svc = mod.get(OutboxService);
  });

  it('enqueue creates pending row', async () => {
    const row = await svc.enqueue('op', { a: 1 }, 'c');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'op',
        payload: { a: 1 },
        status: OutboxStatus.PENDING,
        correlationId: 'c',
      }),
    );
    expect(row.id).toBe('ob-1');
  });

  it('markFailed bumps attempts and sets status', async () => {
    repo.findOne.mockResolvedValue({
      id: 'ob-1',
      attempts: 2,
      status: 'pending',
    });

    await svc.markFailed('ob-1', new Error('boom'));

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OutboxStatus.FAILED,
        lastError: 'boom',
        attempts: 3,
      }),
    );
  });
});

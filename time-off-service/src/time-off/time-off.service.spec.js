import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TimeOffService } from './time-off.service';
import { TimeOffRequest } from '../entities/time-off-request.entity';
import { BalancesService } from '../balances/balances.service';
import { HcmClient } from '../hcm/hcm.client';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { AuditAction, TimeOffStatus } from '../common/constants';

describe('TimeOffService', () => {
  let service;
  let requestsRepo;
  let balances;
  let hcm;
  let audit;
  let outbox;

  beforeEach(async () => {
    requestsRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ ...x, id: 'req-1' })),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    balances = {
      tryGet: jest.fn(),
      canReserveDays: jest.fn(),
      reserveDays: jest.fn(),
      releaseReservation: jest.fn(),
      getOne: jest.fn(),
      applyApprovalDeduction: jest.fn(),
    };
    hcm = {
      validateReservation: jest.fn(),
      commitTimeOff: jest.fn(),
    };
    audit = { record: jest.fn() };
    outbox = {
      enqueue: jest.fn().mockResolvedValue({ id: 'ox1' }),
      markSent: jest.fn(),
      markFailed: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        TimeOffService,
        { provide: getRepositoryToken(TimeOffRequest), useValue: requestsRepo },
        { provide: BalancesService, useValue: balances },
        { provide: HcmClient, useValue: hcm },
        { provide: AuditService, useValue: audit },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = mod.get(TimeOffService);
  });

  describe('createRequest', () => {
    it('throws NotFoundException when no local balance', async () => {
      balances.tryGet.mockResolvedValue(null);
      await expect(
        service.createRequest({ employeeId: 'e', locationId: 'l', days: 1 }, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns existing row when idempotency key matches', async () => {
      const existing = { id: 'same', idempotencyKey: 'k1' };
      requestsRepo.findOne.mockResolvedValue(existing);

      const out = await service.createRequest(
        { employeeId: 'e', locationId: 'l', days: 1, idempotencyKey: 'k1' },
        'c',
      );

      expect(out).toBe(existing);
      expect(audit.record).toHaveBeenCalledWith(
        AuditAction.IDEMPOTENT_REPLAY,
        'TimeOffRequest',
        'same',
        { key: 'k1' },
        'c',
      );
    });

    it('throws ConflictException when cannot reserve locally', async () => {
      balances.tryGet.mockResolvedValue({ id: 'b' });
      balances.canReserveDays.mockReturnValue(false);

      await expect(
        service.createRequest({ employeeId: 'e', locationId: 'l', days: 5 }, null),
      ).rejects.toThrow(ConflictException);
    });

    it('pending_approval when HCM validates', async () => {
      balances.tryGet.mockResolvedValue({});
      balances.canReserveDays.mockReturnValue(true);
      balances.reserveDays.mockResolvedValue({ balanceVersion: 7 });
      hcm.validateReservation.mockResolvedValue({ ok: true, ref: 'vref' });

      const row = await service.createRequest(
        { employeeId: 'e', locationId: 'l', days: 2 },
        null,
      );

      expect(row.status).toBe(TimeOffStatus.PENDING_APPROVAL);
      expect(row.hcmValidationRef).toBe('vref');
      expect(outbox.markSent).toHaveBeenCalledWith('ox1');
    });

    it('rejected and releases reservation when HCM validate fails', async () => {
      balances.tryGet.mockResolvedValue({});
      balances.canReserveDays.mockReturnValue(true);
      balances.reserveDays.mockResolvedValue({ balanceVersion: 1 });
      hcm.validateReservation.mockResolvedValue({
        ok: false,
        error: 'insufficient_balance_in_hcm',
      });

      const row = await service.createRequest(
        { employeeId: 'e', locationId: 'l', days: 9 },
        'c',
      );

      expect(row.status).toBe(TimeOffStatus.REJECTED);
      expect(balances.releaseReservation).toHaveBeenCalledWith('e', 'l', 9);
      expect(outbox.markFailed).toHaveBeenCalled();
    });
  });

  describe('approveRequest', () => {
    it('throws BadRequestException when not pending_approval', async () => {
      requestsRepo.findOne.mockResolvedValue({
        status: TimeOffStatus.APPROVED,
        id: 'x',
      });
      await expect(service.approveRequest('x', null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('approved when commit succeeds', async () => {
      const row = {
        id: 'r1',
        employeeId: 'e',
        locationId: 'l',
        days: 2,
        status: TimeOffStatus.PENDING_APPROVAL,
        balanceVersionAtSubmit: 1,
      };
      requestsRepo.findOne.mockResolvedValue(row);
      balances.getOne.mockResolvedValue({ balanceVersion: 1 });
      hcm.commitTimeOff.mockResolvedValue({ ok: true, ref: 'cref' });

      const out = await service.approveRequest('r1', null);

      expect(out.status).toBe(TimeOffStatus.APPROVED);
      expect(balances.applyApprovalDeduction).toHaveBeenCalledWith('e', 'l', 2);
    });

    it('rejects on stale balance when HCM revalidate fails', async () => {
      const row = {
        id: 'r1',
        employeeId: 'e',
        locationId: 'l',
        days: 2,
        status: TimeOffStatus.PENDING_APPROVAL,
        balanceVersionAtSubmit: 1,
      };
      requestsRepo.findOne.mockResolvedValue(row);
      balances.getOne.mockResolvedValue({ balanceVersion: 99 });
      hcm.validateReservation.mockResolvedValue({ ok: false, error: 'no' });

      const out = await service.approveRequest('r1', null);

      expect(out.status).toBe(TimeOffStatus.REJECTED);
      expect(balances.releaseReservation).toHaveBeenCalledWith('e', 'l', 2);
    });

    it('rejects when HCM commit fails', async () => {
      const row = {
        id: 'r1',
        employeeId: 'e',
        locationId: 'l',
        days: 1,
        status: TimeOffStatus.PENDING_APPROVAL,
        balanceVersionAtSubmit: 5,
      };
      requestsRepo.findOne.mockResolvedValue(row);
      balances.getOne.mockResolvedValue({ balanceVersion: 5 });
      hcm.commitTimeOff.mockResolvedValue({ ok: false, error: 'hcm_down' });

      const out = await service.approveRequest('r1', null);

      expect(out.status).toBe(TimeOffStatus.REJECTED);
      expect(balances.releaseReservation).toHaveBeenCalledWith('e', 'l', 1);
    });
  });

  describe('getRequest', () => {
    it('throws when missing', async () => {
      requestsRepo.findOne.mockResolvedValue(null);
      await expect(service.getRequest('nope')).rejects.toThrow(NotFoundException);
    });
  });
});

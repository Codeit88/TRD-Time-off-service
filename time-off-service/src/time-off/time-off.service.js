import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffRequest } from '../entities/time-off-request.entity';
import { BalancesService } from '../balances/balances.service';
import { HcmClient } from '../hcm/hcm.client';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  AuditAction,
  OutboxOperation,
  TimeOffStatus,
} from '../common/constants';
import { assertPositiveDimensions } from '../common/domain/balance-policy';

@Injectable()
class TimeOffService {
  constructor(
    @InjectRepository(TimeOffRequest)
    requests,
    @Inject(BalancesService)
    balances,
    @Inject(HcmClient)
    hcm,
    @Inject(AuditService)
    audit,
    @Inject(OutboxService)
    outbox,
  ) {
    this.requests = requests;
    this.balances = balances;
    this.hcm = hcm;
    this.audit = audit;
    this.outbox = outbox;
  }

  async createRequest(dto, correlationId) {
    assertPositiveDimensions(dto.employeeId, dto.locationId, dto.days);

    if (dto.idempotencyKey) {
      const existing = await this.requests.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        await this.audit.record(
          AuditAction.IDEMPOTENT_REPLAY,
          'TimeOffRequest',
          existing.id,
          { key: dto.idempotencyKey },
          correlationId,
        );
        return existing;
      }
    }

    const balance = await this.balances.tryGet(dto.employeeId, dto.locationId);
    if (!balance) {
      throw new NotFoundException('No local balance; run HCM sync first');
    }
    if (!this.balances.canReserveDays(balance, dto.days)) {
      throw new ConflictException({
        code: 'INSUFFICIENT_EFFECTIVE_BALANCE',
        message: 'Not enough effective balance once reservations are applied',
      });
    }

    let reserved;
    try {
      reserved = await this.balances.reserveDays(
        dto.employeeId,
        dto.locationId,
        dto.days,
      );
    } catch (e) {
      if (e.code === 'INSUFFICIENT') {
        throw new ConflictException({
          code: 'INSUFFICIENT_EFFECTIVE_BALANCE',
          message: 'Reservation race lost',
        });
      }
      throw e;
    }

    const row = this.requests.create({
      employeeId: dto.employeeId,
      locationId: dto.locationId,
      days: dto.days,
      status: TimeOffStatus.PENDING_VALIDATION,
      idempotencyKey: dto.idempotencyKey ?? null,
      balanceVersionAtSubmit: reserved.balanceVersion,
      correlationId: correlationId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.requests.save(row);

    const outValidate = await this.outbox.enqueue(
      OutboxOperation.HCM_VALIDATE,
      { requestId: row.id },
      correlationId,
    );

    const hcmResult = await this.hcm.validateReservation({
      employeeId: dto.employeeId,
      locationId: dto.locationId,
      days: dto.days,
    });

    if (hcmResult.ok) {
      await this.outbox.markSent(outValidate.id);
      row.status = TimeOffStatus.PENDING_APPROVAL;
      row.hcmValidationRef = hcmResult.ref;
      row.updatedAt = new Date();
      await this.requests.save(row);
      await this.audit.record(
        AuditAction.TIME_OFF_CREATED,
        'TimeOffRequest',
        row.id,
        { days: dto.days, hcmValidationRef: hcmResult.ref },
        correlationId,
      );
      return row;
    }

    await this.outbox.markFailed(outValidate.id, hcmResult.error || 'hcm_reject');
    row.status = TimeOffStatus.REJECTED;
    row.lastError = hcmResult.error || 'hcm_reject';
    row.updatedAt = new Date();
    await this.requests.save(row);
    await this.balances.releaseReservation(dto.employeeId, dto.locationId, dto.days);
    await this.audit.record(
      AuditAction.TIME_OFF_REJECTED,
      'TimeOffRequest',
      row.id,
      { phase: 'validate', error: row.lastError },
      correlationId,
    );
    return row;
  }

  async approveRequest(requestId, correlationId) {
    const row = await this.requests.findOne({ where: { id: requestId } });
    if (!row) throw new NotFoundException('Request not found');
    if (row.status !== TimeOffStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot approve request in status ${row.status}`,
      );
    }

    const balance = await this.balances.getOne(row.employeeId, row.locationId);
    let revalidated = false;

    if (balance.balanceVersion !== row.balanceVersionAtSubmit) {
      const hcmRecheck = await this.hcm.validateReservation({
        employeeId: row.employeeId,
        locationId: row.locationId,
        days: row.days,
      });
      revalidated = true;
      if (!hcmRecheck.ok) {
        row.status = TimeOffStatus.REJECTED;
        row.lastError = hcmRecheck.error || 'stale_balance';
        row.updatedAt = new Date();
        await this.requests.save(row);
        await this.balances.releaseReservation(
          row.employeeId,
          row.locationId,
          row.days,
        );
        await this.audit.record(
          AuditAction.TIME_OFF_REJECTED,
          'TimeOffRequest',
          row.id,
          { phase: 'approve_stale', error: row.lastError },
          correlationId,
        );
        return row;
      }
      await this.audit.record(
        AuditAction.STALE_BALANCE_REVALIDATED,
        'TimeOffRequest',
        row.id,
        { fromVersion: row.balanceVersionAtSubmit, toVersion: balance.balanceVersion },
        correlationId,
      );
    }

    const outCommit = await this.outbox.enqueue(
      OutboxOperation.HCM_COMMIT,
      { requestId: row.id },
      correlationId,
    );

    const commit = await this.hcm.commitTimeOff({
      requestId: row.id,
      employeeId: row.employeeId,
      locationId: row.locationId,
      days: row.days,
    });

    if (commit.ok) {
      await this.outbox.markSent(outCommit.id);
      await this.balances.applyApprovalDeduction(
        row.employeeId,
        row.locationId,
        row.days,
      );
      row.status = TimeOffStatus.APPROVED;
      row.hcmCommitRef = commit.ref;
      row.balanceVersionAtSubmit = balance.balanceVersion;
      row.updatedAt = new Date();
      await this.requests.save(row);
      await this.audit.record(
        AuditAction.TIME_OFF_APPROVED,
        'TimeOffRequest',
        row.id,
        { hcmCommitRef: commit.ref, revalidated },
        correlationId,
      );
      return row;
    }

    await this.outbox.markFailed(outCommit.id, commit.error || 'hcm_commit_failed');
    row.lastError = commit.error || 'hcm_commit_failed';
    row.updatedAt = new Date();
    await this.requests.save(row);
    await this.balances.releaseReservation(
      row.employeeId,
      row.locationId,
      row.days,
    );
    row.status = TimeOffStatus.REJECTED;
    await this.requests.save(row);
    await this.audit.record(
      AuditAction.TIME_OFF_REJECTED,
      'TimeOffRequest',
      row.id,
      { phase: 'commit', error: row.lastError },
      correlationId,
    );
    return row;
  }

  async getRequest(id) {
    const row = await this.requests.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Request not found');
    return row;
  }
}
export { TimeOffService };

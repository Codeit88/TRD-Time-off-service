import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeBalance } from '../entities/employee-balance.entity';
import {
  canReserve,
  detectDrift,
  effectiveAvailable,
} from '../common/domain/balance-policy';

@Injectable()
class BalancesService {
  constructor(
    @InjectRepository(EmployeeBalance)
    balances,
  ) {
    this.balances = balances;
  }

  async getOne(employeeId, locationId) {
    const row = await this.balances.findOne({ where: { employeeId, locationId } });
    if (!row) {
      throw new NotFoundException('No balance row for employee/location');
    }
    return row;
  }

  async tryGet(employeeId, locationId) {
    return this.balances.findOne({ where: { employeeId, locationId } });
  }

  effective(row) {
    return effectiveAvailable(row.availableDays, row.reservedDays);
  }

  canReserveDays(row, days) {
    return canReserve(this.effective(row), days);
  }

  async reserveDays(employeeId, locationId, days) {
    return this.balances.manager.transaction(async (trx) => {
      const repo = trx.getRepository(EmployeeBalance);
      const row = await repo.findOne({ where: { employeeId, locationId } });
      if (!row) throw new NotFoundException('No balance row for employee/location');
      if (!canReserve(effectiveAvailable(row.availableDays, row.reservedDays), days)) {
        const err = new Error('insufficient_effective_balance');
        err.code = 'INSUFFICIENT';
        throw err;
      }
      row.reservedDays = Math.round((row.reservedDays + days) * 1000) / 1000;
      row.updatedAt = new Date();
      await repo.save(row);
      return row;
    });
  }

  async releaseReservation(employeeId, locationId, days) {
    await this.balances.manager.transaction(async (trx) => {
      const repo = trx.getRepository(EmployeeBalance);
      const row = await repo.findOne({ where: { employeeId, locationId } });
      if (!row) return;
      row.reservedDays = Math.max(
        0,
        Math.round((row.reservedDays - days) * 1000) / 1000,
      );
      row.updatedAt = new Date();
      await repo.save(row);
    });
  }

  async applyApprovalDeduction(employeeId, locationId, days) {
    return this.balances.manager.transaction(async (trx) => {
      const repo = trx.getRepository(EmployeeBalance);
      const row = await repo.findOne({ where: { employeeId, locationId } });
      if (!row) throw new NotFoundException('No balance row for employee/location');
      row.availableDays = Math.round((row.availableDays - days) * 1000) / 1000;
      row.reservedDays = Math.max(
        0,
        Math.round((row.reservedDays - days) * 1000) / 1000,
      );
      row.balanceVersion += 1;
      row.updatedAt = new Date();
      await repo.save(row);
      return row;
    });
  }

  /**
   * Batch upsert from HCM. Bumps balanceVersion when values change.
   * Returns drift flag when HCM available < local reservations.
   */
  async applyBatchRows(items) {
    const results = [];
    for (const item of items) {
      const {
        employeeId,
        locationId,
        availableDays,
        sourceToken,
      } = item;
      let row = await this.balances.findOne({ where: { employeeId, locationId } });
      const drift = row
        ? detectDrift(Number(availableDays), row.reservedDays)
        : false;

      if (!row) {
        row = this.balances.create({
          employeeId,
          locationId,
          availableDays: Number(availableDays),
          reservedDays: 0,
          balanceVersion: 1,
          lastHcmSourceToken: sourceToken ?? null,
          updatedAt: new Date(),
        });
      } else {
        const nextAvail = Number(availableDays);
        const changed = nextAvail !== row.availableDays || (sourceToken && sourceToken !== row.lastHcmSourceToken);
        row.availableDays = nextAvail;
        row.lastHcmSourceToken = sourceToken ?? row.lastHcmSourceToken;
        if (changed) row.balanceVersion += 1;
        row.updatedAt = new Date();
      }
      await this.balances.save(row);
      results.push({ employeeId, locationId, drift, balanceVersion: row.balanceVersion });
    }
    return results;
  }
}
export { BalancesService };

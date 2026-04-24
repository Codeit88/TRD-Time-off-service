import { Controller, Get, Inject, Query, NotFoundException } from '@nestjs/common';
import { BalancesService } from './balances.service';

@Controller('balances')
class BalancesController {
  constructor(
    @Inject(BalancesService)
    balances,
  ) {
    this.balances = balances;
  }

  @Get()
  async getBalance(
    @Query('employeeId') employeeId,
    @Query('locationId') locationId,
  ) {
    if (!employeeId || !locationId) {
      throw new NotFoundException('employeeId and locationId required');
    }
    const row = await this.balances.tryGet(employeeId, locationId);
    if (!row) throw new NotFoundException('No balance for this pair');
    return {
      employeeId: row.employeeId,
      locationId: row.locationId,
      availableDays: row.availableDays,
      reservedDays: row.reservedDays,
      effectiveAvailable: this.balances.effective(row),
      balanceVersion: row.balanceVersion,
      lastHcmSourceToken: row.lastHcmSourceToken,
      updatedAt: row.updatedAt,
    };
  }
}
export { BalancesController };

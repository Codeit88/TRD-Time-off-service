import { Entity, Column, PrimaryGeneratedColumn, Unique, Index } from 'typeorm';

@Entity('employee_balances')
@Unique('UQ_employee_location', ['employeeId', 'locationId'])
@Index('IDX_balance_employee', ['employeeId'])
class EmployeeBalance {
  @PrimaryGeneratedColumn('uuid')
  id;

  @Column({ type: 'varchar', length: 64 })
  employeeId;

  @Column({ type: 'varchar', length: 64 })
  locationId;

  /** Authoritative snapshot last applied from HCM (or initial seed). */
  @Column({ type: 'float', default: 0 })
  availableDays;

  /** Sum of days tied to non-terminal requests (validation/approval in flight). */
  @Column({ type: 'float', default: 0 })
  reservedDays;

  /**
   * Monotonic counter bumped on every material balance change (sync, approval).
   * Requests store this to detect stale reads before manager approval.
   */
  @Column({ type: 'int', default: 0 })
  balanceVersion;

  /** Optional opaque token from last batch sync row for troubleshooting. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  lastHcmSourceToken;

  @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
  updatedAt;
}
export { EmployeeBalance };

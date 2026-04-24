import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('time_off_requests')
@Index('IDX_timeoff_employee', ['employeeId'])
@Index('IDX_timeoff_status', ['status'])
class TimeOffRequest {
  @PrimaryGeneratedColumn('uuid')
  id;

  @Column({ type: 'varchar', length: 64 })
  employeeId;

  @Column({ type: 'varchar', length: 64 })
  locationId;

  @Column({ type: 'float' })
  days;

  @Column({ type: 'varchar', length: 32 })
  status;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotencyKey;

  @Column({ type: 'int' })
  balanceVersionAtSubmit;

  @Column({ type: 'varchar', length: 256, nullable: true })
  hcmValidationRef;

  @Column({ type: 'varchar', length: 256, nullable: true })
  hcmCommitRef;

  @Column({ type: 'varchar', length: 128, nullable: true })
  correlationId;

  @Column({ type: 'text', nullable: true })
  lastError;

  @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
  createdAt;

  @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
  updatedAt;
}
export { TimeOffRequest };

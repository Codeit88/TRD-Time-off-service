import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index('IDX_audit_entity', ['entityType', 'entityId'])
@Index('IDX_audit_correlation', ['correlationId'])
class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id;

  @Column({ type: 'varchar', length: 64 })
  action;

  @Column({ type: 'varchar', length: 64 })
  entityType;

  @Column({ type: 'varchar', length: 64 })
  entityId;

  @Column({ type: 'simple-json', nullable: true })
  payload;

  @Column({ type: 'varchar', length: 128, nullable: true })
  correlationId;

  @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
  createdAt;
}
export { AuditLog };

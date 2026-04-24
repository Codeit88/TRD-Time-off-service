import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('outbox_entries')
@Index('IDX_outbox_status', ['status'])
class OutboxEntry {
  @PrimaryGeneratedColumn('uuid')
  id;

  @Column({ type: 'varchar', length: 32 })
  operation;

  @Column({ type: 'simple-json' })
  payload;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status;

  @Column({ type: 'int', default: 0 })
  attempts;

  @Column({ type: 'text', nullable: true })
  lastError;

  @Column({ type: 'varchar', length: 128, nullable: true })
  correlationId;

  @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
  createdAt;
}
export { OutboxEntry };

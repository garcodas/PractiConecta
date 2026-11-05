import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('outbox_events')
@Index('idx_outbox_pending', ['createdAt'], { where: 'published_at IS NULL' })
export class OutboxEvent {
  @PrimaryColumn('uuid')
  id: string;

  @Column('text')
  type: string;

  @Column('int')
  version: number;

  @Column('timestamptz', { name: 'occurred_at' })
  occurredAt: Date;

  @Column('jsonb')
  data: unknown;

  @Column('timestamptz', { name: 'published_at', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('notifications')
@Unique('uq_notifications_event_recipient', ['eventId', 'recipientId'])
@Index('idx_notifications_inbox', ['recipientId', 'readAt', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'recipient_id' })
  recipientId: string;

  @Column('uuid', { name: 'event_id' })
  eventId: string;

  @Column('text')
  type: string;

  @Column('text')
  title: string;

  @Column('text')
  body: string;

  @Column('text')
  link: string;

  @Column('timestamptz', { name: 'read_at', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

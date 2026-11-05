import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { ApplicationStatus } from '../shared/contracts/index.js';

const STATUS_LIST = `'ENVIADA', 'EN_REVISION', 'ENTREVISTA', 'ACEPTADA', 'RECHAZADA'`;

@Entity('applications')
@Unique('uq_applications_offer_student', ['offerId', 'studentId'])
@Check('chk_applications_status', `status IN (${STATUS_LIST})`)
@Index('idx_applications_student', ['studentId'])
@Index('idx_applications_company_offer', ['companyId', 'offerId'])
export class ApplicationRow {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { name: 'offer_id' })
  offerId: string;

  @Column('uuid', { name: 'student_id' })
  studentId: string;

  /** Copias deliberadas de offers_db (design.md, D5). */
  @Column('uuid', { name: 'company_id' })
  companyId: string;

  @Column('text', { name: 'offer_title' })
  offerTitle: string;

  @Column('text', { name: 'company_name' })
  companyName: string;

  @Column('text')
  status: ApplicationStatus;

  @Column('timestamptz', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamptz', { name: 'updated_at' })
  updatedAt: Date;
}

@Entity('application_status_history')
@Index('idx_history_application', ['applicationId', 'changedAt'])
export class StatusHistoryRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => ApplicationRow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application?: ApplicationRow;

  @Column('text', { name: 'from_status', nullable: true })
  fromStatus: ApplicationStatus | null;

  @Column('text', { name: 'to_status' })
  toStatus: ApplicationStatus;

  @Column('uuid', { name: 'changed_by' })
  changedBy: string;

  @Column('timestamptz', { name: 'changed_at' })
  changedAt: Date;
}

import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { CareerCode, Modality, OfferStatus, Schedule } from '../shared/contracts/index.js';

@Entity('offers')
@Check('chk_offers_status', `status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CERRADA')`)
@Check('chk_offers_modality', `modality IN ('PRESENCIAL', 'REMOTA', 'HIBRIDA')`)
@Check('chk_offers_schedule', `schedule IN ('TIEMPO_COMPLETO', 'MEDIO_TIEMPO')`)
@Index('idx_offers_search', ['status', 'careerCode', 'modality', 'schedule', 'deadline'])
@Index('idx_offers_company', ['companyId'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'company_id' })
  companyId: string;

  /** Copia deliberada: no hay JOIN entre bases (design.md, D5). */
  @Column('text', { name: 'company_name' })
  companyName: string;

  @Column('text')
  title: string;

  @Column('text')
  description: string;

  @Column('text', { name: 'career_code' })
  careerCode: CareerCode;

  @Column('text')
  modality: Modality;

  @Column('text')
  schedule: Schedule;

  /** Último día en que se admiten postulaciones. */
  @Column('date')
  deadline: string;

  @Column('text', { default: 'PENDIENTE' })
  status: OfferStatus;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column('uuid', { name: 'reviewed_by', nullable: true })
  reviewedBy: string | null;

  @Column('timestamptz', { name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column('timestamptz', { name: 'closed_at', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

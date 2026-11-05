import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CareerCode, CompanyStatus, Role } from '../shared/contracts/index.js';

@Entity('users')
@Check('chk_users_role', `role IN ('STUDENT', 'COMPANY', 'COORDINATOR')`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { name: 'password_hash' })
  passwordHash: string;

  @Column('text')
  role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  name: string;
}

@Entity('student_profiles')
@Check('chk_student_semester', 'semester BETWEEN 1 AND 12')
export class StudentProfile {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column('text', { name: 'full_name' })
  fullName: string;

  @Column('text', { name: 'career_code' })
  careerCode: CareerCode;

  @Column('int')
  semester: number;

  /** Referencia al CV: la carga real está fuera del prototipo. */
  @Column('text', { name: 'cv_file_name', nullable: true })
  cvFileName: string | null;

  @ManyToMany(() => Skill)
  @JoinTable({
    name: 'student_skills',
    joinColumn: { name: 'student_id', referencedColumnName: 'userId' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills?: Skill[];
}

@Entity('company_profiles')
@Check('chk_company_status', `status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')`)
export class CompanyProfile {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column('text')
  name: string;

  @Column('text', { name: 'contact_email' })
  contactEmail: string;

  @Column('text', { name: 'contact_phone' })
  contactPhone: string;

  @Column('text', { default: 'PENDIENTE' })
  status: CompanyStatus;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column('uuid', { name: 'reviewed_by', nullable: true })
  reviewedBy: string | null;

  @Column('timestamptz', { name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;
}

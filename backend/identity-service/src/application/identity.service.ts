import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { assertUuid, conflict, notFound, requireRole, unauthenticated, validationError, type ActorLike } from '../shared/common/index.js';
import type { identityProto, Role } from '../shared/contracts/index.js';
import { recordEvent } from '../shared/outbox/index.js';
import { DUMMY_HASH, verifyPassword } from '../domain/password.js';
import { CompanyProfile, StudentProfile, User } from '../infrastructure/entities.js';

const COORDINATOR_NAME = 'Coordinación de prácticas';

const toCompany = (company: CompanyProfile): identityProto.Company => ({
  id: company.userId,
  name: company.name,
  contactEmail: company.contactEmail,
  contactPhone: company.contactPhone,
  status: company.status,
  rejectionReason: company.rejectionReason ?? '',
});

@Injectable()
export class IdentityService {
  constructor(private readonly dataSource: DataSource) {}

  private async toUser(user: User): Promise<identityProto.User> {
    const base = { id: user.id, email: user.email, role: user.role, displayName: COORDINATOR_NAME, companyStatus: '' };
    if (user.role === 'STUDENT') {
      const profile = await this.dataSource.getRepository(StudentProfile).findOneByOrFail({ userId: user.id });
      return { ...base, displayName: profile.fullName };
    }
    if (user.role === 'COMPANY') {
      const profile = await this.dataSource.getRepository(CompanyProfile).findOneByOrFail({ userId: user.id });
      return { ...base, displayName: profile.name, companyStatus: profile.status };
    }
    return base;
  }

  async login(email: string, password: string): Promise<identityProto.User> {
    const user = await this.dataSource.getRepository(User).findOneBy({ email: email.trim().toLowerCase() });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw unauthenticated('Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
    return this.toUser(user);
  }

  async getUser(userId: string): Promise<identityProto.User> {
    assertUuid(userId);
    const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw notFound();
    return this.toUser(user);
  }

  async listPendingCompanies(actor: ActorLike | undefined): Promise<identityProto.CompanyList> {
    requireRole(actor, 'COORDINATOR');
    const items = await this.dataSource
      .getRepository(CompanyProfile)
      .find({ where: { status: 'PENDIENTE' }, order: { name: 'ASC' } });
    return { items: items.map(toCompany) };
  }

  async decideCompany(
    actor: ActorLike | undefined,
    companyId: string,
    approve: boolean,
    reason: string,
  ): Promise<identityProto.Company> {
    const coordinator = requireRole(actor, 'COORDINATOR');
    assertUuid(companyId, 'La empresa no existe.');
    const motive = reason.trim();
    if (!approve && !motive) throw validationError({ reason: 'Indica el motivo del rechazo.' });

    return this.dataSource.transaction(async (manager) => {
      const company = await manager.findOne(CompanyProfile, {
        where: { userId: companyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!company) throw notFound('La empresa no existe.');
      if (company.status !== 'PENDIENTE') {
        throw conflict('COMPANY_ALREADY_DECIDED', 'Esta empresa ya fue revisada.');
      }
      company.status = approve ? 'APROBADA' : 'RECHAZADA';
      company.rejectionReason = approve ? null : motive;
      company.reviewedBy = coordinator.userId;
      company.reviewedAt = new Date();
      await manager.save(company);
      if (approve) {
        await recordEvent(manager, 'company.approved', { companyId, companyName: company.name });
      } else {
        await recordEvent(manager, 'company.rejected', { companyId, companyName: company.name, reason: motive });
      }
      return toCompany(company);
    });
  }

  /**
   * Devuelve solo los perfiles pedidos, nunca un listado general: el gateway
   * los solicita después de comprobar que son postulantes de la empresa.
   */
  async getStudentSummaries(
    actor: ActorLike | undefined,
    studentIds: string[],
  ): Promise<identityProto.StudentSummaryList> {
    requireRole(actor, 'COMPANY');
    if (studentIds.length === 0) return { items: [] };
    const profiles = await this.dataSource
      .getRepository(StudentProfile)
      .find({ where: { userId: In(studentIds) }, relations: { skills: true } });
    return {
      items: profiles.map((profile) => ({
        id: profile.userId,
        fullName: profile.fullName,
        careerCode: profile.careerCode,
        semester: profile.semester,
        skills: (profile.skills ?? []).map((skill) => skill.name).sort(),
        hasCv: profile.cvFileName !== null,
      })),
    };
  }

  async getCompany(companyId: string): Promise<identityProto.Company> {
    assertUuid(companyId, 'La empresa no existe.');
    const company = await this.dataSource.getRepository(CompanyProfile).findOneBy({ userId: companyId });
    if (!company) throw notFound('La empresa no existe.');
    return toCompany(company);
  }

  async listUserIdsByRole(role: string): Promise<identityProto.UserIdList> {
    const users = await this.dataSource.getRepository(User).find({ where: { role: role as Role }, select: { id: true } });
    return { userIds: users.map((user) => user.id) };
  }
}

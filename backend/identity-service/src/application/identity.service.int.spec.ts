import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertMigrationsReversible, freshDatabase, testDatabaseUrl, truncateAll } from '../shared/common/index.js';
import { OutboxEvent } from '../shared/outbox/index.js';
import { createDataSource } from '../data-source.js';
import { hashPassword } from '../domain/password.js';
import { CompanyProfile, Skill, StudentProfile, User } from '../infrastructure/entities.js';
import { IdentityService } from './identity.service.js';

const ds = createDataSource(testDatabaseUrl('identity'));
const service = new IdentityService(ds);
const coordinator = { userId: '00000000-0000-4000-8000-00000000000a', role: 'COORDINATOR' };
const companyId = '00000000-0000-4000-8000-00000000000b';
const studentId = '00000000-0000-4000-8000-00000000000c';
const companyActor = { userId: companyId, role: 'COMPANY' };

describe('identity-service', () => {
  beforeAll(async () => {
    await freshDatabase(ds);
    await assertMigrationsReversible(ds);
  });
  afterAll(() => ds.destroy());

  beforeEach(async () => {
    await truncateAll(ds);
    const passwordHash = await hashPassword('clave');
    await ds.getRepository(User).insert([
      { id: coordinator.userId, email: 'c@x.edu', role: 'COORDINATOR', passwordHash },
      { id: companyId, email: 'e@x.edu', role: 'COMPANY', passwordHash },
      { id: studentId, email: 's@x.edu', role: 'STUDENT', passwordHash },
    ]);
    await ds.getRepository(CompanyProfile).insert({
      userId: companyId, name: 'ACME', contactEmail: 'e@x.edu', contactPhone: '1', status: 'PENDIENTE',
    });
    await ds.getRepository(StudentProfile).insert({
      userId: studentId, fullName: 'Ana', careerCode: 'SISTEMAS', semester: 8, cvFileName: 'ana.pdf',
    });
    const [skill] = await ds.getRepository(Skill).save([{ name: 'SQL' }]);
    await ds.query('INSERT INTO student_skills VALUES ($1, $2)', [studentId, skill.id]);
  });

  it('inicia sesión y no devuelve la contraseña', async () => {
    const user = await service.login(' S@x.edu ', 'clave');
    expect(user).toMatchObject({ id: studentId, role: 'STUDENT', displayName: 'Ana' });
    expect(JSON.stringify(user)).not.toContain('scrypt');
  });

  it('falla igual con correo inexistente y con contraseña incorrecta', async () => {
    const wrongPassword = await service.login('s@x.edu', 'mala').catch((e) => e);
    const wrongEmail = await service.login('nadie@x.edu', 'clave').catch((e) => e);
    expect(wrongPassword).toMatchObject({ kind: 'UNAUTHENTICATED', code: 'INVALID_CREDENTIALS' });
    expect(wrongEmail.message).toBe(wrongPassword.message);
    expect(wrongEmail.code).toBe(wrongPassword.code);
  });

  it('almacena las contraseñas solo como hash', async () => {
    const user = await ds.getRepository(User).findOneByOrFail({ id: studentId });
    expect(user.passwordHash).not.toContain('clave');
  });

  it('el resumen de estudiantes no incluye datos sensibles', async () => {
    const { items } = await service.getStudentSummaries(companyActor, [studentId]);
    expect(items).toEqual([
      { id: studentId, fullName: 'Ana', careerCode: 'SISTEMAS', semester: 8, skills: ['SQL'], hasCv: true },
    ]);
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain('s@x.edu');
    expect(serialized).not.toContain('ana.pdf');
  });

  it('no hay listado general de estudiantes', async () => {
    expect((await service.getStudentSummaries(companyActor, [])).items).toEqual([]);
    await expect(service.getStudentSummaries({ userId: studentId, role: 'STUDENT' }, [studentId])).rejects.toMatchObject({ kind: 'FORBIDDEN' });
  });

  it('aprueba una empresa y guarda el evento en la misma transacción', async () => {
    const company = await service.decideCompany(coordinator, companyId, true, '');
    expect(company.status).toBe('APROBADA');
    const row = await ds.getRepository(CompanyProfile).findOneByOrFail({ userId: companyId });
    expect(row).toMatchObject({ reviewedBy: coordinator.userId });
    expect(row.reviewedAt).toBeInstanceOf(Date);
    const events = await ds.getRepository(OutboxEvent).find();
    expect(events.map((event) => event.type)).toEqual(['company.approved']);
  });

  it('rechaza con motivo y exige el motivo', async () => {
    await expect(service.decideCompany(coordinator, companyId, false, '  ')).rejects.toMatchObject({ kind: 'VALIDATION' });
    const company = await service.decideCompany(coordinator, companyId, false, 'Sin documentos');
    expect(company).toMatchObject({ status: 'RECHAZADA', rejectionReason: 'Sin documentos' });
    const [event] = await ds.getRepository(OutboxEvent).find();
    expect(event).toMatchObject({ type: 'company.rejected', data: { reason: 'Sin documentos' } });
  });

  it('responde conflicto si la empresa ya fue resuelta y conserva la decisión', async () => {
    await service.decideCompany(coordinator, companyId, true, '');
    await expect(service.decideCompany(coordinator, companyId, false, 'x')).rejects.toMatchObject({
      kind: 'CONFLICT',
      code: 'COMPANY_ALREADY_DECIDED',
    });
    expect((await service.getCompany(companyId)).status).toBe('APROBADA');
    expect(await ds.getRepository(OutboxEvent).count()).toBe(1);
  });

  it('solo el coordinador decide y lista pendientes', async () => {
    await expect(service.decideCompany(companyActor, companyId, true, '')).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(service.listPendingCompanies(companyActor)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    expect((await service.listPendingCompanies(coordinator)).items.map((c) => c.name)).toEqual(['ACME']);
  });

  it('resuelve destinatarios por rol', async () => {
    expect((await service.listUserIdsByRole('COORDINATOR')).userIds).toEqual([coordinator.userId]);
  });
});

import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, assertMigrationsReversible, freshDatabase, testDatabaseUrl, todayIn, truncateAll, unavailable } from '../shared/common/index.js';
import { OutboxEvent } from '../shared/outbox/index.js';
import { createDataSource } from '../data-source.js';
import { ApplicationRow, StatusHistoryRow } from '../infrastructure/entities.js';
import { TypeOrmApplicationRepository } from '../infrastructure/typeorm-application.repository.js';
import { ApplicationsService } from './applications.service.js';

const ds = createDataSource(testDatabaseUrl('applications'));
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const offerId = uuid(1);
const companyId = uuid(2);
const otherCompanyId = uuid(3);
const student = { userId: uuid(4), role: 'STUDENT' };
const otherStudent = { userId: uuid(5), role: 'STUDENT' };
const company = { userId: companyId, role: 'COMPANY' };
const otherCompany = { userId: otherCompanyId, role: 'COMPANY' };
const today = todayIn('America/Guatemala');

const snapshot = (overrides = {}) => ({
  id: offerId,
  companyId,
  companyName: 'ACME',
  title: 'Practicante',
  status: 'APROBADA',
  deadline: addDays(today, 5),
  ...overrides,
});

const getSnapshot = vi.fn();
const service = new ApplicationsService(new TypeOrmApplicationRepository(ds), { getSnapshot });
const events = () => ds.getRepository(OutboxEvent).find({ order: { createdAt: 'ASC' } });

describe('applications-service', () => {
  beforeAll(async () => {
    await freshDatabase(ds);
    await assertMigrationsReversible(ds);
  });
  afterAll(() => ds.destroy());
  beforeEach(async () => {
    await truncateAll(ds);
    getSnapshot.mockReset().mockResolvedValue(snapshot());
  });

  describe('postulación', () => {
    it('registra Enviada, historial y evento', async () => {
      const application = await service.submit(student, offerId);
      expect(application).toMatchObject({ status: 'ENVIADA', companyId, offerTitle: 'Practicante', companyName: 'ACME' });
      expect(await ds.getRepository(StatusHistoryRow).countBy({ applicationId: application.id })).toBe(1);
      const [event] = await events();
      expect(event).toMatchObject({ type: 'application.submitted', data: { companyId, studentId: student.userId } });
    });

    it('acepta el último día', async () => {
      getSnapshot.mockResolvedValue(snapshot({ deadline: today }));
      await expect(service.submit(student, offerId)).resolves.toBeDefined();
    });

    it('rechaza una oferta vencida', async () => {
      getSnapshot.mockResolvedValue(snapshot({ deadline: addDays(today, -1) }));
      await expect(service.submit(student, offerId)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'OFFER_EXPIRED' });
      expect(await ds.getRepository(ApplicationRow).count()).toBe(0);
    });

    it('rechaza una oferta cerrada', async () => {
      getSnapshot.mockResolvedValue(snapshot({ status: 'CERRADA' }));
      await expect(service.submit(student, offerId)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'OFFER_CLOSED' });
    });

    it.each(['PENDIENTE', 'RECHAZADA'])('una oferta %s responde 404', async (status) => {
      getSnapshot.mockResolvedValue(snapshot({ status }));
      await expect(service.submit(student, offerId)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    });

    it('offers-service caído responde 503 y no registra nada', async () => {
      getSnapshot.mockRejectedValue(unavailable());
      await expect(service.submit(student, offerId)).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
      expect(await ds.getRepository(ApplicationRow).count()).toBe(0);
      expect(await events()).toHaveLength(0);
    });

    it('una postulación repetida conserva la original', async () => {
      const first = await service.submit(student, offerId);
      await expect(service.submit(student, offerId)).rejects.toMatchObject({ kind: 'CONFLICT', code: 'ALREADY_APPLIED' });
      const rows = await ds.getRepository(ApplicationRow).find();
      expect(rows.map((row) => row.id)).toEqual([first.id]);
      expect(await events()).toHaveLength(1);
    });

    it('20 peticiones simultáneas registran exactamente una', async () => {
      const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.submit(student, offerId)));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      expect(rejected.every((r) => r.reason.code === 'ALREADY_APPLIED')).toBe(true);
      expect(await ds.getRepository(ApplicationRow).count()).toBe(1);
      expect(await events()).toHaveLength(1);
    });

    it('solo un estudiante se postula', async () => {
      await expect(service.submit(company, offerId)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    });
  });

  describe('cambio de estado', () => {
    it('recorre el ciclo y deja historial y eventos', async () => {
      const { id } = await service.submit(student, offerId);
      for (const status of ['EN_REVISION', 'ENTREVISTA', 'ACEPTADA']) await service.changeStatus(company, id, status);
      const { application, history } = await service.getMine(student, id);
      expect(application.status).toBe('ACEPTADA');
      expect(history.map((change) => change.toStatus)).toEqual(['ENVIADA', 'EN_REVISION', 'ENTREVISTA', 'ACEPTADA']);
      expect(history[1]).toMatchObject({ fromStatus: 'ENVIADA', changedBy: companyId });
      const types = (await events()).map((event) => event.type);
      expect(types.filter((type) => type === 'application.status_changed')).toHaveLength(3);
    });

    it('una transición inválida no cambia nada', async () => {
      const { id } = await service.submit(student, offerId);
      await expect(service.changeStatus(company, id, 'ACEPTADA')).rejects.toMatchObject({ kind: 'CONFLICT' });
      expect((await service.getMine(student, id)).application.status).toBe('ENVIADA');
      expect(await events()).toHaveLength(1);
    });

    it('un estado desconocido es un error de validación', async () => {
      const { id } = await service.submit(student, offerId);
      await expect(service.changeStatus(company, id, 'GANADA')).rejects.toMatchObject({ kind: 'VALIDATION' });
    });

    it('transiciones simultáneas: se aplica una y se emite un evento', async () => {
      const { id } = await service.submit(student, offerId);
      const results = await Promise.allSettled([
        service.changeStatus(company, id, 'EN_REVISION'),
        service.changeStatus(company, id, 'EN_REVISION'),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason.kind).toBe('CONFLICT');
      expect((await events()).filter((event) => event.type === 'application.status_changed')).toHaveLength(1);
    });

    it('la postulación de otra empresa responde 404', async () => {
      const { id } = await service.submit(student, offerId);
      await expect(service.changeStatus(otherCompany, id, 'EN_REVISION')).rejects.toMatchObject({ kind: 'NOT_FOUND' });
      expect((await service.getMine(student, id)).application.status).toBe('ENVIADA');
    });
  });

  describe('consultas por propietario', () => {
    it('el estudiante ve solo las suyas', async () => {
      const mine = await service.submit(student, offerId);
      expect((await service.listMine(student)).map((a) => a.id)).toEqual([mine.id]);
      expect(await service.listMine(otherStudent)).toEqual([]);
      await expect(service.getMine(otherStudent, mine.id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    });

    it('la empresa ve solo las de sus ofertas', async () => {
      await service.submit(student, offerId);
      await service.submit(otherStudent, offerId);
      expect(await service.listByOffer(company, offerId)).toHaveLength(2);
      expect(await service.listByOffer(otherCompany, offerId)).toEqual([]);
    });

    it('cuenta por oferta solo para el dueño', async () => {
      await service.submit(student, offerId);
      await service.submit(otherStudent, offerId);
      expect((await service.countByOffers(company, [offerId])).get(offerId)).toBe(2);
      expect((await service.countByOffers(otherCompany, [offerId])).size).toBe(0);
    });

    it('encuentra la postulación del estudiante en una oferta', async () => {
      const mine = await service.submit(student, offerId);
      expect((await service.findMineByOffer(student, offerId))?.id).toBe(mine.id);
      expect(await service.findMineByOffer(otherStudent, offerId)).toBeNull();
    });

    it('la postulación sigue disponible sin consultar la oferta', async () => {
      await service.submit(student, offerId);
      getSnapshot.mockRejectedValue(unavailable());
      expect(await service.listMine(student)).toHaveLength(1);
    });
  });
});

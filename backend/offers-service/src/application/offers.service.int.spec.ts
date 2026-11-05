import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, assertMigrationsReversible, freshDatabase, testDatabaseUrl, todayIn, truncateAll, unavailable } from '../shared/common/index.js';
import { OutboxEvent } from '../shared/outbox/index.js';
import { createDataSource } from '../data-source.js';
import { Offer } from '../infrastructure/offer.entity.js';
import { OffersService } from './offers.service.js';

const ds = createDataSource(testDatabaseUrl('offers'));
const companyId = '00000000-0000-4000-8000-0000000000c1';
const otherCompanyId = '00000000-0000-4000-8000-0000000000c2';
const company = { userId: companyId, role: 'COMPANY' };
const otherCompany = { userId: otherCompanyId, role: 'COMPANY' };
const coordinator = { userId: '00000000-0000-4000-8000-0000000000d1', role: 'COORDINATOR' };
const student = { userId: '00000000-0000-4000-8000-0000000000e1', role: 'STUDENT' };
const today = todayIn('America/Guatemala');
const input = {
  title: 'Practicante',
  description: 'Apoyar',
  careerCode: 'SISTEMAS',
  modality: 'REMOTA',
  schedule: 'MEDIO_TIEMPO',
  deadline: addDays(today, 5),
};
const noFilters = { careerCode: '', modality: '', schedule: '' };

const getCompany = vi.fn();
const service = new OffersService(ds, { getCompany });

const seed = (overrides: Partial<Offer>) =>
  ds.getRepository(Offer).save({
    companyId,
    companyName: 'ACME',
    title: 'Oferta',
    description: 'd',
    careerCode: 'SISTEMAS',
    modality: 'REMOTA',
    schedule: 'MEDIO_TIEMPO',
    status: 'APROBADA',
    deadline: addDays(today, 5),
    ...overrides,
  } as Offer);

const eventTypes = async () => (await ds.getRepository(OutboxEvent).find()).map((event) => event.type);

describe('offers-service', () => {
  beforeAll(async () => {
    await freshDatabase(ds);
    await assertMigrationsReversible(ds);
  });
  afterAll(() => ds.destroy());
  beforeEach(async () => {
    await truncateAll(ds);
    getCompany.mockReset().mockResolvedValue({ id: companyId, name: 'ACME', status: 'APROBADA' });
  });

  describe('creación', () => {
    it('queda Pendiente, a nombre de la empresa, con evento', async () => {
      const offer = await service.create(company, input);
      expect(offer).toMatchObject({ status: 'PENDIENTE', companyId, companyName: 'ACME', deadline: input.deadline });
      expect(await eventTypes()).toEqual(['offer.submitted']);
    });

    it('rechaza empresas no aprobadas', async () => {
      for (const status of ['PENDIENTE', 'RECHAZADA']) {
        getCompany.mockResolvedValue({ id: companyId, name: 'ACME', status });
        await expect(service.create(company, input)).rejects.toMatchObject({ kind: 'FORBIDDEN', code: 'COMPANY_NOT_APPROVED' });
      }
      expect(await ds.getRepository(Offer).count()).toBe(0);
    });

    it('valida antes de crear', async () => {
      await expect(service.create(company, { ...input, deadline: addDays(today, -1) })).rejects.toMatchObject({
        kind: 'VALIDATION',
        fields: { deadline: expect.any(String) },
      });
      expect(await ds.getRepository(Offer).count()).toBe(0);
    });

    it('propaga la indisponibilidad de identity sin crear nada', async () => {
      getCompany.mockRejectedValue(unavailable());
      await expect(service.create(company, input)).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
      expect(await eventTypes()).toEqual([]);
    });

    it('solo una empresa crea ofertas', async () => {
      await expect(service.create(student, input)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    });
  });

  describe('revisión', () => {
    it('aprueba, registra quién y emite evento', async () => {
      const { id } = await seed({ status: 'PENDIENTE' });
      await service.decide(coordinator, id, true, '');
      const row = await ds.getRepository(Offer).findOneByOrFail({ id });
      expect(row).toMatchObject({ status: 'APROBADA', reviewedBy: coordinator.userId });
      expect(await eventTypes()).toEqual(['offer.approved']);
    });

    it('rechaza con motivo obligatorio', async () => {
      const { id } = await seed({ status: 'PENDIENTE' });
      await expect(service.decide(coordinator, id, false, ' ')).rejects.toMatchObject({ kind: 'VALIDATION' });
      expect((await ds.getRepository(Offer).findOneByOrFail({ id })).status).toBe('PENDIENTE');
      const offer = await service.decide(coordinator, id, false, 'Datos incompletos');
      expect(offer).toMatchObject({ status: 'RECHAZADA', rejectionReason: 'Datos incompletos' });
      expect(await eventTypes()).toEqual(['offer.rejected']);
    });

    it('una oferta resuelta responde conflicto', async () => {
      const { id } = await seed({ status: 'APROBADA' });
      await expect(service.decide(coordinator, id, false, 'x')).rejects.toMatchObject({ kind: 'CONFLICT' });
      expect((await ds.getRepository(Offer).findOneByOrFail({ id })).status).toBe('APROBADA');
    });

    it('dos decisiones simultáneas: solo una se aplica', async () => {
      const { id } = await seed({ status: 'PENDIENTE' });
      const results = await Promise.allSettled([service.decide(coordinator, id, true, ''), service.decide(coordinator, id, true, '')]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await eventTypes()).toEqual(['offer.approved']);
    });

    it('solo el coordinador revisa', async () => {
      const { id } = await seed({ status: 'PENDIENTE' });
      await expect(service.decide(student, id, true, '')).rejects.toMatchObject({ kind: 'FORBIDDEN' });
      await expect(service.listPending(company)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
      expect((await service.listPending(coordinator)).items).toHaveLength(1);
    });
  });

  describe('cierre', () => {
    it('cierra una oferta propia aprobada', async () => {
      const { id } = await seed({});
      expect((await service.close(company, id)).status).toBe('CERRADA');
      expect((await ds.getRepository(Offer).findOneByOrFail({ id })).closedAt).toBeInstanceOf(Date);
    });

    it.each(['PENDIENTE', 'RECHAZADA', 'CERRADA'] as const)('no cierra una oferta %s', async (status) => {
      const { id } = await seed({ status });
      await expect(service.close(company, id)).rejects.toMatchObject({ kind: 'CONFLICT' });
    });

    it('una oferta ajena responde 404', async () => {
      const { id } = await seed({});
      await expect(service.close(otherCompany, id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
      expect((await ds.getRepository(Offer).findOneByOrFail({ id })).status).toBe('APROBADA');
    });
  });

  describe('búsqueda', () => {
    it('incluye solo aprobadas y vigentes, con el último día incluido', async () => {
      const visible = await seed({ title: 'visible' });
      const lastDay = await seed({ title: 'hoy', deadline: today });
      await seed({ title: 'pendiente', status: 'PENDIENTE' });
      await seed({ title: 'rechazada', status: 'RECHAZADA' });
      await seed({ title: 'cerrada', status: 'CERRADA' });
      await seed({ title: 'vencida', deadline: addDays(today, -1) });
      const result = await service.search(student, noFilters, 1);
      expect(result.total).toBe(2);
      expect(result.items.map((offer) => offer.id)).toEqual([lastDay.id, visible.id]);
    });

    it('combina filtros', async () => {
      await seed({ title: 'a', careerCode: 'SISTEMAS', modality: 'REMOTA', schedule: 'MEDIO_TIEMPO' });
      await seed({ title: 'b', careerCode: 'SISTEMAS', modality: 'PRESENCIAL', schedule: 'MEDIO_TIEMPO' });
      await seed({ title: 'c', careerCode: 'DISENO', modality: 'REMOTA', schedule: 'TIEMPO_COMPLETO' });
      const titles = async (f: Partial<typeof noFilters>) =>
        (await service.search(student, { ...noFilters, ...f }, 1)).items.map((o) => o.title).sort();
      expect(await titles({ modality: 'REMOTA' })).toEqual(['a', 'c']);
      expect(await titles({ careerCode: 'SISTEMAS', modality: 'REMOTA', schedule: 'MEDIO_TIEMPO' })).toEqual(['a']);
      expect(await titles({ careerCode: 'MERCADOTECNIA' })).toEqual([]);
    });

    it('rechaza filtros inválidos', async () => {
      await expect(service.search(student, { ...noFilters, modality: 'LUNAR' }, 1)).rejects.toMatchObject({ kind: 'VALIDATION' });
    });

    it('pagina de 20 en 20', async () => {
      for (let i = 0; i < 25; i++) await seed({ title: `o${i}` });
      const first = await service.search(student, noFilters, 1);
      const second = await service.search(student, noFilters, 2);
      expect(first).toMatchObject({ total: 25, page: 1, pageSize: 20 });
      expect(first.items).toHaveLength(20);
      expect(second.items).toHaveLength(5);
    });

    it('el detalle solo existe para ofertas visibles', async () => {
      const visible = await seed({});
      const pending = await seed({ status: 'PENDIENTE' });
      const closed = await seed({ status: 'CERRADA' });
      expect((await service.getVisible(student, visible.id)).id).toBe(visible.id);
      await expect(service.getVisible(student, pending.id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
      await expect(service.getVisible(student, closed.id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
      await expect(service.getVisible(student, 'no-es-uuid')).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    });
  });

  it('cada empresa ve solo sus ofertas', async () => {
    await seed({ title: 'mía', status: 'RECHAZADA', rejectionReason: 'x' });
    const foreign = await seed({ title: 'ajena', companyId: otherCompanyId });
    const { items } = await service.listByCompany(company);
    expect(items.map((offer) => offer.title)).toEqual(['mía']);
    expect(items[0].rejectionReason).toBe('x');
    await expect(service.getOwned(company, foreign.id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
  });

  it('la instantánea interna no expone operaciones de aprobación', async () => {
    const { id } = await seed({});
    const snapshot = await service.getSnapshot(id);
    expect(Object.keys(snapshot).sort()).toEqual(['companyId', 'companyName', 'deadline', 'id', 'status', 'title']);
    const { OffersInternalController } = await import('../transport/offers.controller.js');
    const methods = Object.getOwnPropertyNames(OffersInternalController.prototype).filter((name) => name !== 'constructor');
    expect(methods).toEqual(['getOfferSnapshot']);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { approvedOffer, Client, compose, eventually, login, USERS } from './helpers.js';

const up = () => compose('up', '-d', '--wait');

describe('tolerancia a fallos', () => {
  let company: Client, coordinator: Client, student: Client;

  beforeAll(async () => {
    [company, coordinator, student] = await Promise.all([login(USERS.company), login(USERS.coordinator), login(USERS.student)]);
  });

  afterAll(() => {
    up();
  });

  const unread = async () => (await student.get('/notifications')).body.items as any[];

  it('con notificaciones caído el negocio sigue y la notificación llega al recuperarse', async () => {
    const offer = await approvedOffer(company, coordinator);
    const { body: application } = await student.post(`/offers/${offer.id}/applications`);

    compose('stop', 'notifications-service');
    const changed = await company.patch(`/company/applications/${application.id}/status`, { status: 'EN_REVISION' });
    expect(changed.status).toBe(200);

    compose('start', 'notifications-service');
    up();
    await eventually(async () => {
      const reply = await student.get('/notifications');
      return reply.status === 200 && reply.body.items.some((n: any) => n.link.endsWith(application.id));
    }, 30_000);
  });

  it('con Redis caído el cambio se confirma y el evento se publica al recuperarse', async () => {
    const offer = await approvedOffer(company, coordinator);
    const { body: application } = await student.post(`/offers/${offer.id}/applications`);

    compose('stop', 'redis');
    const changed = await company.patch(`/company/applications/${application.id}/status`, { status: 'RECHAZADA' });
    expect(changed.status).toBe(200);

    compose('start', 'redis');
    up();
    await eventually(async () => (await unread()).some((n) => n.link.endsWith(application.id) && n.title.includes('Rechazada')), 40_000);
  });

  it('con offers-service caído postularse responde 503 y el reintento funciona', async () => {
    const offer = await approvedOffer(company, coordinator);
    compose('stop', 'offers-service');
    const failed = await student.post(`/offers/${offer.id}/applications`);
    expect(failed.status).toBe(503);
    expect(failed.body.message).toMatch(/reintentar/);
    compose('start', 'offers-service');
    up();
    const retried = await eventually(async () => {
      const reply = await student.post(`/offers/${offer.id}/applications`);
      return reply.status === 201 && reply;
    }, 30_000);
    expect(retried.body.status).toBe('ENVIADA');
  });

  it('reiniciar todo conserva postulaciones e historial (RNF-05)', async () => {
    const offer = await approvedOffer(company, coordinator);
    const { body: application } = await student.post(`/offers/${offer.id}/applications`);
    await company.patch(`/company/applications/${application.id}/status`, { status: 'EN_REVISION' });

    compose('restart');
    up();

    const again = await eventually(async () => {
      const client = await login(USERS.student).catch(() => undefined);
      if (!client) return undefined;
      const reply = await client.get(`/me/applications/${application.id}`);
      return reply.status === 200 && reply;
    }, 60_000);
    expect(again.body.application.status).toBe('EN_REVISION');
    expect(again.body.history.map((h: any) => h.toStatus)).toEqual(['ENVIADA', 'EN_REVISION']);
  });
});

import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { approvedOffer, Client, forgedStudent, login, USERS } from './helpers.js';

describe('picos de postulación (RNF-04 y RNF-05)', () => {
  let company: Client, coordinator: Client;

  beforeAll(async () => {
    [company, coordinator] = await Promise.all([login(USERS.company), login(USERS.coordinator)]);
  });

  it('200 estudiantes a la vez: cada confirmación es exactamente un registro', async () => {
    const offer = await approvedOffer(company, coordinator);
    const start = Date.now();
    const replies = await Promise.all(
      Array.from({ length: 200 }, () => forgedStudent().post(`/offers/${offer.id}/applications`)),
    );
    const confirmed = replies.filter((reply) => reply.status === 201);
    console.log(`200 postulaciones en ${Date.now() - start} ms; confirmadas: ${confirmed.length}`);
    expect(confirmed).toHaveLength(200);
    expect(new Set(confirmed.map((reply) => reply.body.id)).size).toBe(200);

    const { body } = await company.get(`/company/offers/${offer.id}/applications`);
    expect(body.items).toHaveLength(200);
    expect(new Set(body.items.map((a: any) => a.studentId)).size).toBe(200);
  });

  it('20 peticiones simultáneas de un estudiante: una se registra y el resto responde 409', async () => {
    const offer = await approvedOffer(company, coordinator);
    const id = randomUUID();
    const replies = await Promise.all(Array.from({ length: 20 }, () => forgedStudent(id).post(`/offers/${offer.id}/applications`)));
    const statuses = replies.map((reply) => reply.status).sort();
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(19);
    expect((await company.get(`/company/offers/${offer.id}/applications`)).body.items).toHaveLength(1);
  });
});

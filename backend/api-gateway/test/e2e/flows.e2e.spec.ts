import { beforeAll, describe, expect, it } from 'vitest';
import { approvedOffer, Client, eventually, inDays, login, offerInput, USERS } from './helpers.js';

const notificationsOf = async (client: Client) => (await client.get('/notifications')).body.items as any[];

describe('Flujo 1: publicar una oferta', () => {
  it('la empresa crea, el coordinador aprueba y el estudiante la encuentra', async () => {
    const [company, coordinator, student] = await Promise.all([login(USERS.company), login(USERS.coordinator), login(USERS.student)]);
    const input = offerInput({ modality: 'HIBRIDA', schedule: 'TIEMPO_COMPLETO', careerCode: 'MERCADOTECNIA' });
    const search = `/offers?career=MERCADOTECNIA&modality=HIBRIDA&schedule=TIEMPO_COMPLETO`;

    const created = await company.post('/company/offers', input);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDIENTE');

    const before = await student.get(search);
    expect(before.body.items.map((o: any) => o.id)).not.toContain(created.body.id);
    expect((await student.get(`/offers/${created.body.id}`)).status).toBe(404);

    const pending = await coordinator.get('/admin/offers/pending');
    expect(pending.body.items.map((o: any) => o.id)).toContain(created.body.id);
    await eventually(async () =>
      (await notificationsOf(coordinator)).some((n) => n.body.includes(input.title)),
    );

    const approved = await coordinator.post(`/admin/offers/${created.body.id}/decision`, { approve: true });
    expect(approved.body.status).toBe('APROBADA');

    const after = await student.get(search);
    expect(after.body.items.map((o: any) => o.id)).toContain(created.body.id);
    await eventually(async () =>
      (await notificationsOf(company)).some((n) => n.title === 'Oferta aprobada' && n.body.includes(input.title)),
    );
  });

  it('el rechazo informa el motivo y la oferta no se publica', async () => {
    const [company, coordinator, student] = await Promise.all([login(USERS.company), login(USERS.coordinator), login(USERS.student)]);
    const { body: offer } = await company.post('/company/offers', offerInput());
    expect((await coordinator.post(`/admin/offers/${offer.id}/decision`, { approve: false })).status).toBe(422);
    const rejected = await coordinator.post(`/admin/offers/${offer.id}/decision`, { approve: false, reason: 'Falta descripción' });
    expect(rejected.body).toMatchObject({ status: 'RECHAZADA', rejectionReason: 'Falta descripción' });
    expect((await student.get(`/offers/${offer.id}`)).status).toBe(404);
    expect((await coordinator.post(`/admin/offers/${offer.id}/decision`, { approve: true })).status).toBe(409);
    await eventually(async () => (await notificationsOf(company)).some((n) => n.body.includes('Falta descripción')));
  });

  it('valida los datos de la oferta y los filtros con 422', async () => {
    const [company, student] = await Promise.all([login(USERS.company), login(USERS.student)]);
    const invalid = await company.post('/company/offers', offerInput({ title: '', deadline: inDays(-3), modality: 'LUNAR' }));
    expect(invalid.status).toBe(422);
    expect(Object.keys(invalid.body.fields).sort()).toEqual(['deadline', 'modality', 'title']);
    expect((await student.get('/offers?modality=LUNAR')).status).toBe(422);
  });

  it('una empresa pendiente no puede publicar', async () => {
    const pendingCompany = await login(USERS.pendingCompany);
    const me = await pendingCompany.get('/auth/me');
    if (me.body.companyStatus === 'APROBADA') return;
    const reply = await pendingCompany.post('/company/offers', offerInput());
    expect(reply.status).toBe(403);
    expect(reply.body.code).toBe('COMPANY_NOT_APPROVED');
  });
});

describe('Flujo 2: postularse', () => {
  let company: Client, otherCompany: Client, coordinator: Client, student: Client, otherStudent: Client;

  beforeAll(async () => {
    [company, otherCompany, coordinator, student, otherStudent] = await Promise.all([
      login(USERS.company), login(USERS.company2), login(USERS.coordinator), login(USERS.student), login(USERS.student2),
    ]);
  });

  it('de la búsqueda a ver el nuevo estado', async () => {
    const offer = await approvedOffer(company, coordinator);

    const results = await student.get('/offers?career=SISTEMAS&modality=REMOTA');
    expect(results.body.total).toBeGreaterThan(0);
    const detail = await student.get(`/offers/${offer.id}`);
    expect(detail.body).toMatchObject({ offer: { id: offer.id, companyName: 'Tecnologías del Altiplano' }, application: null });

    const applied = await student.post(`/offers/${offer.id}/applications`);
    expect(applied.status).toBe(201);
    expect(applied.body).toMatchObject({ status: 'ENVIADA', allowedTransitions: ['EN_REVISION', 'RECHAZADA'] });

    expect((await student.get(`/offers/${offer.id}`)).body.application.id).toBe(applied.body.id);
    expect((await student.post(`/offers/${offer.id}/applications`)).status).toBe(409);

    await eventually(async () =>
      (await notificationsOf(company)).some((n) => n.title === 'Nueva postulación' && n.body.includes(offer.title)),
    );

    const applicants = await company.get(`/company/offers/${offer.id}/applications`);
    expect(applicants.body.items).toHaveLength(1);
    expect(applicants.body.items[0].student).toEqual({
      id: applied.body.studentId, fullName: 'Ana López', careerCode: 'SISTEMAS', semester: 8,
      skills: ['Git', 'SQL', 'TypeScript'], hasCv: true,
    });

    const offers = await company.get('/company/offers');
    expect(offers.body.items.find((o: any) => o.id === offer.id).applicationCount).toBe(1);

    const changed = await company.patch(`/company/applications/${applied.body.id}/status`, { status: 'EN_REVISION' });
    expect(changed.status).toBe(200);

    const mine = await student.get('/me/applications');
    expect(mine.body.items.find((a: any) => a.id === applied.body.id)).toMatchObject({
      status: 'EN_REVISION', offerTitle: offer.title, companyName: 'Tecnologías del Altiplano',
    });
    const history = await student.get(`/me/applications/${applied.body.id}`);
    expect(history.body.history.map((h: any) => h.toStatus)).toEqual(['ENVIADA', 'EN_REVISION']);

    const notification = await eventually(async () =>
      (await notificationsOf(student)).find((n) => n.link.endsWith(applied.body.id)),
    );
    expect(notification.title).toContain('En revisión');
  });

  it('solo se aplican transiciones válidas', async () => {
    const offer = await approvedOffer(company, coordinator);
    const { body: application } = await student.post(`/offers/${offer.id}/applications`);
    const change = (status: string) => company.patch(`/company/applications/${application.id}/status`, { status });
    expect((await change('ACEPTADA')).status).toBe(409);
    expect((await change('GANADA')).status).toBe(422);
    await change('EN_REVISION');
    await change('ENTREVISTA');
    expect((await change('ACEPTADA')).body.allowedTransitions).toEqual([]);
    expect((await change('RECHAZADA')).status).toBe(409);
  });

  it('cerrar la oferta detiene postulaciones pero conserva las existentes', async () => {
    const offer = await approvedOffer(company, coordinator);
    const { body: application } = await student.post(`/offers/${offer.id}/applications`);
    expect((await otherCompany.post(`/company/offers/${offer.id}/close`)).status).toBe(404);
    expect((await company.post(`/company/offers/${offer.id}/close`)).body.status).toBe('CERRADA');
    expect((await company.post(`/company/offers/${offer.id}/close`)).status).toBe(409);

    const late = await otherStudent.post(`/offers/${offer.id}/applications`);
    expect(late.status).toBe(409);
    expect(late.body.code).toBe('OFFER_CLOSED');
    expect((await student.get(`/offers/${offer.id}`)).status).toBe(404);

    expect((await company.patch(`/company/applications/${application.id}/status`, { status: 'EN_REVISION' })).status).toBe(200);
    expect((await student.get('/me/applications')).body.items.map((a: any) => a.id)).toContain(application.id);
  });

  it('una oferta pendiente no admite postulaciones', async () => {
    const { body: offer } = await company.post('/company/offers', offerInput());
    expect((await student.post(`/offers/${offer.id}/applications`)).status).toBe(404);
  });

  describe('aislamiento (RNF-01 y RNF-03)', () => {
    it('una empresa no ve ni toca postulantes ajenos', async () => {
      const offer = await approvedOffer(company, coordinator);
      const { body: application } = await student.post(`/offers/${offer.id}/applications`);

      const list = await otherCompany.get(`/company/offers/${offer.id}/applications`);
      expect(list.status).toBe(404);
      expect(JSON.stringify(list.body)).not.toContain('Ana');
      expect((await otherCompany.patch(`/company/applications/${application.id}/status`, { status: 'EN_REVISION' })).status).toBe(404);
      expect((await company.get(`/company/offers/${offer.id}/applications`)).body.items[0].status).toBe('ENVIADA');
    });

    it('un estudiante no ve postulaciones ajenas', async () => {
      const offer = await approvedOffer(company, coordinator);
      const { body: application } = await student.post(`/offers/${offer.id}/applications`);
      expect((await otherStudent.get(`/me/applications/${application.id}`)).status).toBe(404);
      expect((await otherStudent.get('/me/applications')).body.items.map((a: any) => a.id)).not.toContain(application.id);
    });

    it('no existe ruta para listar estudiantes y no se expone el correo', async () => {
      expect((await company.get('/students')).status).toBe(404);
      const offer = await approvedOffer(company, coordinator);
      await student.post(`/offers/${offer.id}/applications`);
      const list = await company.get(`/company/offers/${offer.id}/applications`);
      expect(JSON.stringify(list.body)).not.toContain('@demo.edu');
    });

    it('las notificaciones son privadas', async () => {
      const offer = await approvedOffer(company, coordinator);
      const items = await eventually(async () => {
        const list = await notificationsOf(company);
        return list.length > 0 && list;
      });
      expect((await otherCompany.post(`/notifications/${items[0].id}/read`)).status).toBe(404);
      expect(JSON.stringify(await notificationsOf(otherCompany))).not.toContain(offer.title);
    });
  });

  it('marcar notificaciones es idempotente', async () => {
    const offer = await approvedOffer(company, coordinator);
    const { body: application } = await student.post(`/offers/${offer.id}/applications`);
    await company.patch(`/company/applications/${application.id}/status`, { status: 'RECHAZADA' });
    const notification = await eventually(async () =>
      (await notificationsOf(student)).find((n) => n.link.endsWith(application.id)),
    );
    const first = await student.post(`/notifications/${notification.id}/read`);
    const second = await student.post(`/notifications/${notification.id}/read`);
    expect(first.body.readAt).toBeTruthy();
    expect(second.body.readAt).toBe(first.body.readAt);
    expect((await student.post('/notifications/read-all')).body.count).toBe(0);
    expect((await student.get('/notifications/unread-count')).body.count).toBe(0);
  });
});

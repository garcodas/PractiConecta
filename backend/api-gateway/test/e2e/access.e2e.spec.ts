import { beforeAll, describe, expect, it } from 'vitest';
import { Client, login, PASSWORD, USERS } from './helpers.js';

describe('acceso', () => {
  let student: Client, company: Client, coordinator: Client;
  const anonymous = new Client();

  beforeAll(async () => {
    [student, company, coordinator] = await Promise.all([login(USERS.student), login(USERS.company), login(USERS.coordinator)]);
  });

  it('la sesión viaja en una cookie HttpOnly con vencimiento de 8 horas', async () => {
    const reply = await new Client().post('/auth/login', { email: USERS.student, password: PASSWORD });
    const cookie = reply.headers.getSetCookie()[0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=28800/i);
    expect(JSON.stringify(reply.body)).not.toMatch(/password|hash/i);
  });

  it('login inválido: 401 sin revelar qué dato falló', async () => {
    const wrongPassword = await anonymous.post('/auth/login', { email: USERS.student, password: 'mala' });
    const wrongEmail = await anonymous.post('/auth/login', { email: 'nadie@demo.edu', password: 'mala' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongEmail.body).toEqual(wrongPassword.body);
  });

  it.each(['/auth/me', '/offers', '/me/applications', '/company/offers', '/admin/offers/pending', '/notifications'])(
    '%s sin sesión responde 401',
    async (path) => {
      const reply = await anonymous.get(path);
      expect(reply.status).toBe(401);
      expect(reply.body.code).toBeDefined();
    },
  );

  it('una sesión alterada responde 401', async () => {
    const tampered = new Client();
    tampered.cookie = `${student.cookie.slice(0, -3)}abc`;
    expect((await tampered.get('/auth/me')).status).toBe(401);
  });

  it('cerrar sesión borra la cookie', async () => {
    const reply = await (await login(USERS.student)).post('/auth/logout');
    expect(reply.status).toBe(204);
    expect(reply.headers.getSetCookie()[0]).toMatch(/pc_session=;/);
  });

  it('cada rol solo llega a sus rutas', async () => {
    expect((await student.get('/admin/offers/pending')).status).toBe(403);
    expect((await student.post('/company/offers', {})).status).toBe(403);
    expect((await company.get('/offers')).status).toBe(403);
    expect((await company.post('/admin/companies/x/decision', {})).status).toBe(403);
    expect((await coordinator.get('/me/applications')).status).toBe(403);
    expect((await coordinator.get('/company/offers')).status).toBe(403);
  });

  it('/auth/me identifica al usuario y su rol', async () => {
    expect((await student.get('/auth/me')).body).toMatchObject({ role: 'STUDENT', displayName: 'Ana López' });
    expect((await company.get('/auth/me')).body).toMatchObject({ role: 'COMPANY', companyStatus: 'APROBADA' });
  });

  it('rutas inexistentes usan el formato uniforme de error', async () => {
    const reply = await student.get('/no-existe');
    expect(reply.status).toBe(404);
    expect(reply.body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) });
  });

  it('un coordinador debe indicar motivo para rechazar una empresa', async () => {
    const pending = await coordinator.get('/admin/companies/pending');
    const target = pending.body.items[0];
    if (target) {
      const reply = await coordinator.post(`/admin/companies/${target.id}/decision`, { approve: false, reason: '' });
      expect(reply.status).toBe(422);
      expect(reply.body.fields.reason).toBeDefined();
    }
  });
});

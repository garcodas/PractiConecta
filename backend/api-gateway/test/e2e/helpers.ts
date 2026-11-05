import { createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export const BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';
export const PASSWORD = 'Demo2026!';
const JWT_SECRET = process.env.JWT_SECRET ?? 'practiconecta-demo-secret-no-usar-en-produccion';

export interface Reply<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export class Client {
  cookie = '';

  async request<T = any>(method: string, path: string, body?: unknown): Promise<Reply<T>> {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await response.text();
    const parsed = raw ? JSON.parse(raw) : undefined;
    return { status: response.status, body: parsed as T, headers: response.headers };
  }

  get = <T = any>(path: string) => this.request<T>('GET', path);
  post = <T = any>(path: string, body: unknown = {}) => this.request<T>('POST', path, body);
  patch = <T = any>(path: string, body: unknown) => this.request<T>('PATCH', path, body);
}

export async function login(email: string): Promise<Client> {
  const client = new Client();
  const reply = await client.post('/auth/login', { email, password: PASSWORD });
  if (reply.status !== 200) throw new Error(`Login falló para ${email}: ${reply.status}`);
  client.cookie = reply.headers.getSetCookie()[0].split(';')[0];
  return client;
}

/** Sesión firmada para un estudiante sintético: permite generar carga real. */
export function forgedStudent(userId: string = randomUUID()): Client {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const head = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'STUDENT', exp: Math.floor(Date.now() / 1000) + 600 })}`;
  const signature = createHmac('sha256', JWT_SECRET).update(head).digest('base64url');
  const client = new Client();
  client.cookie = `pc_session=${head}.${signature}`;
  return client;
}

export const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export const offerInput = (overrides: object = {}) => ({
  title: `Oferta de prueba ${randomUUID().slice(0, 8)}`,
  description: 'Descripción de la práctica',
  careerCode: 'SISTEMAS',
  modality: 'REMOTA',
  schedule: 'MEDIO_TIEMPO',
  deadline: inDays(10),
  ...overrides,
});

/** Crea y aprueba una oferta. */
export async function approvedOffer(company: Client, coordinator: Client, overrides: object = {}) {
  const created = await company.post('/company/offers', offerInput(overrides));
  if (created.status !== 201) throw new Error(`No se creó la oferta: ${JSON.stringify(created.body)}`);
  const decided = await coordinator.post(`/admin/offers/${created.body.id}/decision`, { approve: true });
  if (decided.status !== 200) throw new Error(`No se aprobó la oferta: ${JSON.stringify(decided.body)}`);
  return decided.body;
}

/** Espera a que se cumpla una condición asíncrona. */
export async function eventually<T>(check: () => Promise<T | undefined | false>, timeoutMs = 15_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() - start > timeoutMs) throw new Error('La condición no se cumplió a tiempo');
    await new Promise((r) => setTimeout(r, 200));
  }
}

export const compose = (...args: string[]) =>
  execFileSync('docker', ['compose', ...args], { cwd: resolve(import.meta.dirname, '../../../..'), stdio: 'pipe' }).toString();

export const USERS = {
  student: 'estudiante@demo.edu',
  student2: 'carlos@demo.edu',
  company: 'empresa@demo.edu',
  company2: 'retail@demo.edu',
  pendingCompany: 'pendiente@demo.edu',
  coordinator: 'coordinador@demo.edu',
};

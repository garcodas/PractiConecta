import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertMigrationsReversible, freshDatabase, TEST_REDIS_URL, testDatabaseUrl, truncateAll } from '../shared/common/index.js';
import type { EventEnvelope, EventType } from '../shared/contracts/index.js';
import { JOB_OPTIONS, redisConnection } from '../shared/queue.js';
import { createDataSource } from '../data-source.js';
import type { NotificationTemplate } from '../domain/notification-template.js';
import { Notification } from '../infrastructure/notification.entity.js';
import { TEMPLATES } from '../templates/templates.js';
import { EventProcessor } from './event-processor.js';
import { NotificationsService } from './notifications.service.js';

const ds = createDataSource(testDatabaseUrl('notifications'));
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const student = { userId: uuid(1), role: 'STUDENT' };
const other = { userId: uuid(2), role: 'STUDENT' };
const coordinators = [uuid(3), uuid(4)];
const directory = { listUserIdsByRole: vi.fn(async () => coordinators) };
const processor = new EventProcessor(ds, TEMPLATES, directory);
const service = new NotificationsService(ds);

const statusChanged = (studentId = student.userId): EventEnvelope<'application.status_changed'> => ({
  eventId: randomUUID(),
  type: 'application.status_changed',
  version: 1,
  occurredAt: new Date().toISOString(),
  data: {
    applicationId: uuid(9), offerId: uuid(8), offerTitle: 'Dev', companyName: 'ACME',
    studentId, fromStatus: 'ENVIADA', toStatus: 'EN_REVISION',
  },
});

describe('notifications-service', () => {
  beforeAll(async () => {
    await freshDatabase(ds);
    await assertMigrationsReversible(ds);
  });
  afterAll(() => ds.destroy());
  beforeEach(() => truncateAll(ds));

  it('un evento repetido crea una sola notificación', async () => {
    const event = statusChanged();
    await processor.process(event);
    await processor.process(event);
    await Promise.all([processor.process(event), processor.process(event)]);
    expect(await ds.getRepository(Notification).count()).toBe(1);
  });

  it('cada coordinador recibe su propia notificación', async () => {
    await processor.process({
      eventId: randomUUID(), type: 'offer.submitted', version: 1, occurredAt: new Date().toISOString(),
      data: { offerId: uuid(8), title: 'Dev', companyId: uuid(7), companyName: 'ACME' },
    });
    const rows = await ds.getRepository(Notification).find();
    expect(rows.map((row) => row.recipientId).sort()).toEqual(coordinators);
  });

  it('agregar un tipo solo requiere otra plantilla', async () => {
    const extra: NotificationTemplate<any> = {
      type: 'nuevo.evento' as EventType,
      recipients: () => [student.userId],
      render: () => ({ title: 'Nuevo', body: 'b', link: '/' }),
    };
    const extended = new EventProcessor(ds, [...TEMPLATES, extra], directory);
    await extended.process({ ...statusChanged(), type: 'nuevo.evento' as EventType });
    expect((await service.list(student, 1)).items[0].title).toBe('Nuevo');
  });

  it('un evento sin plantilla falla y queda para revisión', async () => {
    await expect(processor.process({ ...statusChanged(), type: 'desconocido' as EventType })).rejects.toThrow('sin plantilla');
  });

  it('la bandeja muestra solo lo propio, de lo más reciente a lo más antiguo', async () => {
    const first = statusChanged();
    await processor.process(first);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await processor.process(statusChanged());
    await processor.process(statusChanged(other.userId));
    const inbox = await service.list(student, 1);
    expect(inbox.total).toBe(2);
    expect(new Date(inbox.items[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(inbox.items[1].createdAt).getTime());
    expect(inbox.items[0]).toMatchObject({ link: `/estudiante/postulaciones/${uuid(9)}`, readAt: '' });
  });

  it('cuenta y marca como leída de forma idempotente', async () => {
    await processor.process(statusChanged());
    await processor.process(statusChanged());
    expect(await service.unreadCount(student)).toEqual({ count: 2 });
    const { items } = await service.list(student, 1);
    const read = await service.markRead(student, items[0].id);
    const again = await service.markRead(student, items[0].id);
    expect(read.readAt).not.toBe('');
    expect(again.readAt).toBe(read.readAt);
    expect(await service.unreadCount(student)).toEqual({ count: 1 });
    expect(await service.markAllRead(student)).toEqual({ count: 0 });
    expect(await service.markAllRead(student)).toEqual({ count: 0 });
  });

  it('no permite tocar una notificación ajena', async () => {
    await processor.process(statusChanged());
    const { items } = await service.list(student, 1);
    await expect(service.markRead(other, items[0].id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    expect(await service.unreadCount(student)).toEqual({ count: 1 });
  });

  it('marcar todas no afecta a otros usuarios', async () => {
    await processor.process(statusChanged());
    await service.markAllRead(other);
    expect(await service.unreadCount(student)).toEqual({ count: 1 });
  });

  it('un job fallido se reintenta y al agotar intentos se conserva', async () => {
    const name = `spec-${randomUUID()}`;
    const connection = redisConnection(TEST_REDIS_URL);
    const queue = new Queue(name, { connection });
    let attempts = 0;
    const worker = new Worker(name, async () => {
      attempts++;
      throw new Error('siempre falla');
    }, { connection, settings: { backoffStrategy: () => 1 } });
    await queue.add('x', {}, { ...JOB_OPTIONS, backoff: { type: 'custom' } });
    await queue.add('ok', {}, { attempts: 1 });
    await vi.waitFor(async () => expect(await queue.getFailedCount()).toBe(2), { timeout: 5000 });
    expect(attempts).toBe(6);
    const failed = await queue.getFailed();
    expect(failed.find((job) => job.name === 'x')?.failedReason).toBe('siempre falla');
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
  });
});

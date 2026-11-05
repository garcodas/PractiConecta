import 'reflect-metadata';
import { Queue, Worker } from 'bullmq';
import { DataSource, IsNull, type MigrationInterface, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENT_ROUTES, type EventEnvelope } from '../contracts/index.js';
import { TEST_REDIS_URL, testDatabaseUrl } from '../common/index.js';
import { BullMqEventBus, redisConnection, type EventBus } from './event-bus.js';
import { OutboxEvent } from './outbox-event.entity.js';
import { OutboxPublisher } from './outbox-publisher.js';
import { recordEvent } from './record-event.js';

const SCHEMA = 'outbox_spec';

class CreateOutbox1700000000000 implements MigrationInterface {
  name = 'CreateOutbox1700000000000';
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE ${SCHEMA}.outbox_events (
      id uuid PRIMARY KEY, type text NOT NULL, version int NOT NULL, occurred_at timestamptz NOT NULL,
      data jsonb NOT NULL, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE ${SCHEMA}.outbox_events`);
  }
}

const data = { companyId: 'c', companyName: 'n' };

describe('bandeja de salida', () => {
  let ds: DataSource;

  beforeAll(async () => {
    const admin = new DataSource({ type: 'postgres', url: testDatabaseUrl('identity') });
    await admin.initialize();
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.query(`CREATE SCHEMA ${SCHEMA}`);
    await admin.destroy();
    ds = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl('identity'),
      schema: SCHEMA,
      entities: [OutboxEvent],
      migrations: [CreateOutbox1700000000000],
    });
    await ds.initialize();
    await ds.runMigrations();
  });

  afterAll(() => ds.destroy());
  beforeEach(() => ds.query(`DELETE FROM ${SCHEMA}.outbox_events`));

  const pending = () => ds.getRepository(OutboxEvent).countBy({ publishedAt: IsNull() });

  it('una transacción revertida no deja evento', async () => {
    await ds
      .transaction(async (manager) => {
        await recordEvent(manager, 'company.approved', data);
        throw new Error('falla del negocio');
      })
      .catch(() => undefined);
    expect(await ds.getRepository(OutboxEvent).count()).toBe(0);
  });

  it('dos publicadores simultáneos no publican la misma fila', async () => {
    await ds.transaction(async (manager) => {
      for (let i = 0; i < 40; i++) await recordEvent(manager, 'company.approved', data);
    });
    const seen: string[] = [];
    const bus: EventBus = {
      publish: async (event) => {
        seen.push(event.eventId);
        await new Promise((r) => setTimeout(r, 2));
      },
      close: async () => undefined,
    };
    await Promise.all([new OutboxPublisher(ds, bus).publishBatch(), new OutboxPublisher(ds, bus).publishBatch()]);
    await new OutboxPublisher(ds, bus).publishBatch();
    expect(seen).toHaveLength(40);
    expect(new Set(seen).size).toBe(40);
    expect(await pending()).toBe(0);
  });

  it('si la cola falla el evento sigue pendiente', async () => {
    await ds.transaction((manager) => recordEvent(manager, 'company.approved', data));
    const publish = vi.fn().mockRejectedValue(new Error('cola caída'));
    const publisher = new OutboxPublisher(ds, { publish, close: async () => undefined });
    await expect(publisher.publishBatch()).rejects.toThrow('cola caída');
    expect(await pending()).toBe(1);
  });

  it('publica en BullMQ real y el reintento no duplica el job', async () => {
    // Cola propia: no debe interferir con el sistema si está levantado.
    const queueName = `spec-${crypto.randomUUID()}`;
    const routes = Object.fromEntries(Object.keys(EVENT_ROUTES).map((type) => [type, [queueName]]));
    const bus = new BullMqEventBus(TEST_REDIS_URL, routes as unknown as typeof EVENT_ROUTES);
    const received: EventEnvelope[] = [];
    const worker = new Worker(queueName, async (job) => void received.push(job.data), {
      connection: redisConnection(TEST_REDIS_URL),
    });
    await worker.waitUntilReady();
    const event: EventEnvelope = {
      eventId: crypto.randomUUID(),
      type: 'company.approved',
      version: 1,
      occurredAt: new Date().toISOString(),
      data,
    };
    await new Promise((r) => setTimeout(r, 200));
    await bus.publish(event);
    await bus.publish(event);
    await vi.waitFor(() => expect(received).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 200));
    expect(received).toHaveLength(1);
    await worker.close();
    await bus.close();
    const cleanup = new Queue(queueName, { connection: redisConnection(TEST_REDIS_URL) });
    await cleanup.obliterate({ force: true });
    await cleanup.close();
  });

  it('las migraciones se aplican y se revierten', async () => {
    await ds.undoLastMigration();
    const [{ exists }] = await ds.query(`SELECT to_regclass('${SCHEMA}.outbox_events') IS NOT NULL AS exists`);
    expect(exists).toBe(false);
    await ds.runMigrations();
  });
});

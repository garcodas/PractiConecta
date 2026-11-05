import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import type { EventEnvelope, EventType } from '../contracts/index.js';
import { EVENT_BUS, type EventBus } from './event-bus.js';
import { OutboxEvent } from './outbox-event.entity.js';

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 100;

const toEnvelope = (row: OutboxEvent): EventEnvelope => ({
  eventId: row.id,
  type: row.type as EventType,
  version: row.version,
  occurredAt: row.occurredAt.toISOString(),
  data: row.data as EventEnvelope['data'],
});

/** Mueve los eventos confirmados de la bandeja de salida a la cola. */
@Injectable()
export class OutboxPublisher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
  ) {}

  onApplicationBootstrap() {
    this.running = true;
    this.schedule();
  }

  async onApplicationShutdown() {
    this.running = false;
    clearTimeout(this.timer);
    await this.bus.close();
  }

  private schedule() {
    this.timer = setTimeout(async () => {
      try {
        await this.publishBatch();
      } catch (error) {
        this.logger.warn(`Publicación pospuesta: ${(error as Error).message}`);
      }
      if (this.running) this.schedule();
    }, POLL_INTERVAL_MS);
  }

  /**
   * SKIP LOCKED permite varias réplicas sin publicar la misma fila. Si la cola
   * falla, la transacción se revierte y las filas siguen pendientes.
   */
  async publishBatch(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager
        .getRepository(OutboxEvent)
        .createQueryBuilder('event')
        .where({ publishedAt: IsNull() })
        .orderBy('event.createdAt', 'ASC')
        .limit(BATCH_SIZE)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      for (const row of rows) {
        await this.bus.publish(toEnvelope(row));
        await manager.update(OutboxEvent, row.id, { publishedAt: new Date() });
      }
      return rows.length;
    });
  }
}

import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Worker } from 'bullmq';
import { NOTIFICATIONS_QUEUE, type EventEnvelope } from '../shared/contracts/index.js';
import { redisConnection } from '../shared/queue.js';
import { EventProcessor } from '../application/event-processor.js';

/** Consumidor BullMQ: los reintentos y los fallidos los define el productor al publicar el job. */
@Injectable()
export class EventsWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EventsWorker.name);
  private worker?: Worker;

  constructor(private readonly processor: EventProcessor) {}

  onApplicationBootstrap() {
    this.worker = new Worker<EventEnvelope>(NOTIFICATIONS_QUEUE, (job) => this.processor.process(job.data), {
      connection: { ...redisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379'), maxRetriesPerRequest: null },
      concurrency: 10,
    });
    this.worker.on('failed', (job, error) => this.logger.warn(`Evento ${job?.id} falló: ${error.message}`));
    this.worker.on('error', (error) => this.logger.warn(`Worker: ${error.message}`));
  }

  async onApplicationShutdown() {
    await this.worker?.close();
  }
}

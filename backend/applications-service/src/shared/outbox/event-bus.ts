import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EVENT_ROUTES, type EventEnvelope, type EventType } from '../contracts/index.js';

export const EVENT_BUS = Symbol('EVENT_BUS');

export interface EventBus {
  publish(event: EventEnvelope): Promise<void>;
  close(): Promise<void>;
}

/** `redis://host:puerto` en las opciones de conexión de BullMQ. */
export function redisConnection(url: string) {
  const { hostname, port, password } = new URL(url);
  return { host: hostname, port: Number(port || 6379), password: password || undefined };
}

export const JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 86_400, count: 5_000 },
  // Los eventos que agotan sus intentos se conservan para inspeccionarlos.
  removeOnFail: false,
} as const;

export class BullMqEventBus implements EventBus {
  private readonly logger = new Logger(BullMqEventBus.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly redisUrl: string,
    private readonly routes: Record<EventType, readonly string[]> = EVENT_ROUTES,
  ) {}

  private queue(name: string) {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: {
          ...redisConnection(this.redisUrl),
          // Sin Redis, publicar debe fallar de inmediato: el evento sigue en la
          // bandeja de salida y se reintenta, sin colgar al publicador.
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        },
      });
      queue.on('error', (error) => this.logger.warn(`Cola ${name}: ${error.message}`));
      this.queues.set(name, queue);
    }
    return queue;
  }

  async publish(event: EventEnvelope) {
    await Promise.all(
      this.routes[event.type].map((name) =>
        // jobId = eventId: una republicación no crea un job repetido.
        this.queue(name).add(event.type, event, { jobId: event.eventId, ...JOB_OPTIONS }),
      ),
    );
  }

  async close() {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}

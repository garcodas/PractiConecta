import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import type { EventDataMap, EventType } from '../contracts/index.js';
import { OutboxEvent } from './outbox-event.entity.js';

/**
 * Guarda el evento dentro de la transacción del cambio de negocio: ambos se
 * confirman o se revierten juntos.
 */
export async function recordEvent<T extends EventType>(
  manager: EntityManager,
  type: T,
  data: EventDataMap[T],
): Promise<void> {
  await manager.insert(OutboxEvent, {
    id: randomUUID(),
    type,
    version: 1,
    occurredAt: new Date(),
    data: data as object,
  });
}

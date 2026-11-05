/** Datos de cada evento: bastan para procesarlo sin consultar al productor. */
export interface EventDataMap {
  'company.approved': { companyId: string; companyName: string };
  'company.rejected': { companyId: string; companyName: string; reason: string };
}

export type EventType = keyof EventDataMap;

export interface EventEnvelope<T extends EventType = EventType> {
  eventId: string;
  type: T;
  version: number;
  occurredAt: string;
  data: EventDataMap[T];
}

export const NOTIFICATIONS_QUEUE = 'notifications-events';

/**
 * Colas que reciben cada tipo de evento. BullMQ es punto a punto: un consumidor
 * nuevo agrega aquí su cola sin tocar a los productores.
 */
export const EVENT_ROUTES: Record<EventType, readonly string[]> = {
  'company.approved': [NOTIFICATIONS_QUEUE],
  'company.rejected': [NOTIFICATIONS_QUEUE],
};

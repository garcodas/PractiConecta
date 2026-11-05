/** Datos de cada evento: bastan para procesarlo sin consultar al productor. */
export interface EventDataMap {
  'offer.submitted': { offerId: string; title: string; companyId: string; companyName: string };
  'offer.approved': { offerId: string; title: string; companyId: string };
  'offer.rejected': { offerId: string; title: string; companyId: string; reason: string };
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
  'offer.submitted': [NOTIFICATIONS_QUEUE],
  'offer.approved': [NOTIFICATIONS_QUEUE],
  'offer.rejected': [NOTIFICATIONS_QUEUE],
};

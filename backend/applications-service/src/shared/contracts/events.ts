import type { ApplicationStatus } from './catalogs.js';

/** Datos de cada evento: bastan para procesarlo sin consultar al productor. */
export interface EventDataMap {
  'application.submitted': {
    applicationId: string;
    offerId: string;
    offerTitle: string;
    companyId: string;
    studentId: string;
  };
  'application.status_changed': {
    applicationId: string;
    offerId: string;
    offerTitle: string;
    companyName: string;
    studentId: string;
    fromStatus: ApplicationStatus;
    toStatus: ApplicationStatus;
  };
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
  'application.submitted': [NOTIFICATIONS_QUEUE],
  'application.status_changed': [NOTIFICATIONS_QUEUE],
};

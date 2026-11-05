import type { ApplicationStatus } from './catalogs.js';

/** Datos de cada evento: bastan para procesarlo sin consultar al productor. */
export interface EventDataMap {
  'offer.submitted': { offerId: string; title: string; companyId: string; companyName: string };
  'offer.approved': { offerId: string; title: string; companyId: string };
  'offer.rejected': { offerId: string; title: string; companyId: string; reason: string };
  'company.approved': { companyId: string; companyName: string };
  'company.rejected': { companyId: string; companyName: string; reason: string };
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
  'offer.submitted': [NOTIFICATIONS_QUEUE],
  'offer.approved': [NOTIFICATIONS_QUEUE],
  'offer.rejected': [NOTIFICATIONS_QUEUE],
  'company.approved': [NOTIFICATIONS_QUEUE],
  'company.rejected': [NOTIFICATIONS_QUEUE],
  'application.submitted': [NOTIFICATIONS_QUEUE],
  'application.status_changed': [NOTIFICATIONS_QUEUE],
};

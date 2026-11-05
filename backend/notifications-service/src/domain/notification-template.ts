import type { EventEnvelope, EventType } from '../shared/contracts/index.js';

export const NOTIFICATION_TEMPLATES = Symbol('NOTIFICATION_TEMPLATES');
export const RECIPIENT_DIRECTORY = Symbol('RECIPIENT_DIRECTORY');

export interface RecipientDirectory {
  listUserIdsByRole(role: string): Promise<string[]>;
}

export interface RenderedNotification {
  title: string;
  body: string;
  link: string;
}

/**
 * Patrón Estrategia: cada tipo de evento decide destinatarios y texto. Un tipo
 * nuevo es una clase nueva en la lista de plantillas; el worker no cambia (PAC).
 */
export interface NotificationTemplate<T extends EventType = EventType> {
  readonly type: T;
  recipients(event: EventEnvelope<T>, directory: RecipientDirectory): Promise<string[]> | string[];
  render(event: EventEnvelope<T>): RenderedNotification;
}

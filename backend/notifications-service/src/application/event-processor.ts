import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EventEnvelope } from '../shared/contracts/index.js';
import {
  NOTIFICATION_TEMPLATES,
  RECIPIENT_DIRECTORY,
  type NotificationTemplate,
  type RecipientDirectory,
} from '../domain/notification-template.js';
import { Notification } from '../infrastructure/notification.entity.js';

/** Convierte un evento en notificaciones. Es idempotente: la entrega es al menos una vez. */
@Injectable()
export class EventProcessor {
  private readonly templates: Map<string, NotificationTemplate>;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(NOTIFICATION_TEMPLATES) templates: NotificationTemplate<any>[],
    @Inject(RECIPIENT_DIRECTORY) private readonly directory: RecipientDirectory,
  ) {
    this.templates = new Map(templates.map((template) => [template.type, template]));
  }

  async process(event: EventEnvelope): Promise<void> {
    const template = this.templates.get(event.type);
    // Sin plantilla el job falla y se conserva para revisarlo.
    if (!template) throw new Error(`Evento sin plantilla: ${event.type}`);

    const recipients = await template.recipients(event, this.directory);
    if (recipients.length === 0) return;
    const content = template.render(event);
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values(recipients.map((recipientId) => ({ ...content, recipientId, eventId: event.eventId, type: event.type })))
      .orIgnore()
      .execute();
  }
}

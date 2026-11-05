import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { assertUuid, notFound, unauthenticated, type ActorLike } from '../shared/common/index.js';
import { PAGE_SIZE, type notificationsProto } from '../shared/contracts/index.js';
import { Notification } from '../infrastructure/notification.entity.js';

const NOT_FOUND = 'La notificación no existe.';

const toProto = (notification: Notification): notificationsProto.Notification => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  link: notification.link,
  readAt: notification.readAt?.toISOString() ?? '',
  createdAt: notification.createdAt.toISOString(),
});

const owner = (actor: ActorLike | undefined) => {
  if (!actor?.userId) throw unauthenticated();
  return actor.userId;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(Notification);
  }

  private unread(recipientId: string) {
    return this.repository.countBy({ recipientId, readAt: IsNull() });
  }

  async list(actor: ActorLike | undefined, requestedPage: number): Promise<notificationsProto.NotificationPage> {
    const page = Math.max(1, requestedPage);
    const [items, total] = await this.repository.findAndCount({
      where: { recipientId: owner(actor) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return { items: items.map(toProto), total, page, pageSize: PAGE_SIZE };
  }

  async unreadCount(actor: ActorLike | undefined) {
    return { count: await this.unread(owner(actor)) };
  }

  async markRead(actor: ActorLike | undefined, notificationId: string) {
    const recipientId = owner(actor);
    assertUuid(notificationId, NOT_FOUND);
    const notification = await this.repository.findOneBy({ id: notificationId, recipientId });
    if (!notification) throw notFound(NOT_FOUND);
    if (notification.readAt === null) {
      notification.readAt = new Date();
      await this.repository.save(notification);
    }
    return toProto(notification);
  }

  async markAllRead(actor: ActorLike | undefined) {
    const recipientId = owner(actor);
    await this.repository.update({ recipientId, readAt: IsNull() }, { readAt: new Date() });
    return { count: await this.unread(recipientId) };
  }
}

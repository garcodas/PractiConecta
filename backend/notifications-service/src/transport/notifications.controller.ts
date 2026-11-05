import { Controller } from '@nestjs/common';
import { notificationsProto as proto, type commonProto } from '../shared/contracts/index.js';
import { NotificationsService } from '../application/notifications.service.js';

@Controller()
@proto.NotificationsServiceControllerMethods()
export class NotificationsController implements proto.NotificationsServiceController {
  constructor(private readonly notifications: NotificationsService) {}

  list(request: proto.ListNotificationsRequest) {
    return this.notifications.list(request.actor, request.page);
  }

  getUnreadCount(request: commonProto.ActorRequest) {
    return this.notifications.unreadCount(request.actor);
  }

  markRead(request: proto.MarkReadRequest) {
    return this.notifications.markRead(request.actor, request.notificationId);
  }

  markAllRead(request: commonProto.ActorRequest) {
    return this.notifications.markAllRead(request.actor);
  }
}

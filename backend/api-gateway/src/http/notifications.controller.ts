import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { callGrpc } from '../shared/common/index.js';
import type { commonProto } from '../shared/contracts/index.js';
import { CurrentActor } from '../auth/auth.guard.js';
import { GrpcClients } from '../grpc/grpc-clients.js';
import { pageOf } from './body.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly grpc: GrpcClients) {}

  @Get()
  list(@CurrentActor() actor: commonProto.Actor, @Query('page') page?: string) {
    return callGrpc(this.grpc.notifications.list({ actor, page: pageOf(page) }));
  }

  @Get('unread-count')
  unreadCount(@CurrentActor() actor: commonProto.Actor) {
    return callGrpc(this.grpc.notifications.getUnreadCount({ actor }));
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentActor() actor: commonProto.Actor) {
    return callGrpc(this.grpc.notifications.markAllRead({ actor }));
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentActor() actor: commonProto.Actor, @Param('id') notificationId: string) {
    return callGrpc(this.grpc.notifications.markRead({ actor, notificationId }));
  }
}

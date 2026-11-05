import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { callGrpc } from '../shared/common/index.js';
import { identityProto } from '../shared/contracts/index.js';
import type { RecipientDirectory } from '../domain/notification-template.js';

export const IDENTITY_CLIENT = 'IDENTITY_CLIENT';

@Injectable()
export class GrpcRecipientDirectory implements RecipientDirectory, OnModuleInit {
  private client: identityProto.IdentityInternalServiceClient;

  constructor(@Inject(IDENTITY_CLIENT) private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.client = this.grpc.getService(identityProto.IDENTITY_INTERNAL_SERVICE_NAME);
  }

  async listUserIdsByRole(role: string) {
    return (await callGrpc(this.client.listUserIdsByRole({ role }))).userIds;
  }
}

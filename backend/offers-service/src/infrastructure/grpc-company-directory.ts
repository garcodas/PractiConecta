import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { callGrpc } from '../shared/common/index.js';
import { identityProto } from '../shared/contracts/index.js';
import type { CompanyDirectory } from '../domain/company-directory.js';

export const IDENTITY_CLIENT = 'IDENTITY_CLIENT';

@Injectable()
export class GrpcCompanyDirectory implements CompanyDirectory, OnModuleInit {
  private client: identityProto.IdentityInternalServiceClient;

  constructor(@Inject(IDENTITY_CLIENT) private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.client = this.grpc.getService(identityProto.IDENTITY_INTERNAL_SERVICE_NAME);
  }

  getCompany(companyId: string) {
    return callGrpc(this.client.getCompany({ companyId }));
  }
}

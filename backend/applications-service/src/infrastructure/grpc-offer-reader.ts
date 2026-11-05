import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { callGrpc } from '../shared/common/index.js';
import { offersProto } from '../shared/contracts/index.js';
import type { OfferReader } from '../domain/ports/offer-reader.js';

export const OFFERS_CLIENT = 'OFFERS_CLIENT';

@Injectable()
export class GrpcOfferReader implements OfferReader, OnModuleInit {
  private client: offersProto.OffersInternalServiceClient;

  constructor(@Inject(OFFERS_CLIENT) private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.client = this.grpc.getService(offersProto.OFFERS_INTERNAL_SERVICE_NAME);
  }

  getSnapshot(offerId: string) {
    return callGrpc(this.client.getOfferSnapshot({ offerId }));
  }
}

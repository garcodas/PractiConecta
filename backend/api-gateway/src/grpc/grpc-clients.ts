import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { applicationsProto, identityProto, notificationsProto, offersProto } from '../shared/contracts/index.js';

export const IDENTITY = 'IDENTITY_CLIENT';
export const OFFERS = 'OFFERS_CLIENT';
export const APPLICATIONS = 'APPLICATIONS_CLIENT';
export const NOTIFICATIONS = 'NOTIFICATIONS_CLIENT';

/** Clientes de los servicios internos: la topología queda oculta tras el gateway. */
@Injectable()
export class GrpcClients implements OnModuleInit {
  identity: identityProto.IdentityServiceClient;
  offers: offersProto.OffersServiceClient;
  applications: applicationsProto.ApplicationsServiceClient;
  notifications: notificationsProto.NotificationsServiceClient;

  constructor(
    @Inject(IDENTITY) private readonly identityGrpc: ClientGrpc,
    @Inject(OFFERS) private readonly offersGrpc: ClientGrpc,
    @Inject(APPLICATIONS) private readonly applicationsGrpc: ClientGrpc,
    @Inject(NOTIFICATIONS) private readonly notificationsGrpc: ClientGrpc,
  ) {}

  onModuleInit() {
    this.identity = this.identityGrpc.getService(identityProto.IDENTITY_SERVICE_NAME);
    this.offers = this.offersGrpc.getService(offersProto.OFFERS_SERVICE_NAME);
    this.applications = this.applicationsGrpc.getService(applicationsProto.APPLICATIONS_SERVICE_NAME);
    this.notifications = this.notificationsGrpc.getService(notificationsProto.NOTIFICATIONS_SERVICE_NAME);
  }
}

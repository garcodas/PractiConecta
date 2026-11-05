import { Controller } from '@nestjs/common';
import { applicationsProto as proto, type commonProto } from '../shared/contracts/index.js';
import { ApplicationsService } from '../application/applications.service.js';
import type { Application, StatusChange } from '../domain/application.js';
import { stateOf } from '../domain/state/application-state.js';

const toProto = (application: Application): proto.Application => ({
  id: application.id,
  offerId: application.offerId,
  studentId: application.studentId,
  companyId: application.companyId,
  offerTitle: application.offerTitle,
  companyName: application.companyName,
  status: application.status,
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString(),
  // La interfaz solo ofrece lo que el dominio permite; no duplica las reglas.
  allowedTransitions: [...stateOf(application.status).allowedTransitions],
});

const toChange = (change: StatusChange): proto.StatusChange => ({
  fromStatus: change.fromStatus ?? '',
  toStatus: change.toStatus,
  changedAt: change.changedAt.toISOString(),
});

@Controller()
@proto.ApplicationsServiceControllerMethods()
export class ApplicationsController implements proto.ApplicationsServiceController {
  constructor(private readonly applications: ApplicationsService) {}

  async submit(request: proto.OfferScopedRequest) {
    return toProto(await this.applications.submit(request.actor, request.offerId));
  }

  async listMine(request: commonProto.ActorRequest) {
    return { items: (await this.applications.listMine(request.actor)).map(toProto) };
  }

  async getMine(request: proto.ApplicationIdRequest) {
    const { application, history } = await this.applications.getMine(request.actor, request.applicationId);
    return { application: toProto(application), history: history.map(toChange) };
  }

  async findMineByOffer(request: proto.OfferScopedRequest) {
    const application = await this.applications.findMineByOffer(request.actor, request.offerId);
    return { found: application !== null, application: application ? toProto(application) : undefined };
  }

  async listByOffer(request: proto.OfferScopedRequest) {
    return { items: (await this.applications.listByOffer(request.actor, request.offerId)).map(toProto) };
  }

  async changeStatus(request: proto.ChangeStatusRequest) {
    return toProto(await this.applications.changeStatus(request.actor, request.applicationId, request.toStatus));
  }

  async countByOffers(request: proto.CountByOffersRequest) {
    const counts = await this.applications.countByOffers(request.actor, request.offerIds);
    return { items: [...counts].map(([offerId, count]) => ({ offerId, count })) };
  }
}

import { Controller } from '@nestjs/common';
import { offersProto as proto, type commonProto } from '../shared/contracts/index.js';
import { OffersService } from '../application/offers.service.js';

@Controller()
@proto.OffersServiceControllerMethods()
export class OffersController implements proto.OffersServiceController {
  constructor(private readonly offers: OffersService) {}

  createOffer({ actor, ...input }: proto.CreateOfferRequest) {
    return this.offers.create(actor, input);
  }

  listCompanyOffers(request: commonProto.ActorRequest) {
    return this.offers.listByCompany(request.actor);
  }

  getCompanyOffer(request: proto.OfferActionRequest) {
    return this.offers.getOwned(request.actor, request.offerId);
  }

  closeOffer(request: proto.OfferActionRequest) {
    return this.offers.close(request.actor, request.offerId);
  }

  listPendingOffers(request: commonProto.ActorRequest) {
    return this.offers.listPending(request.actor);
  }

  decideOffer(request: proto.DecideOfferRequest) {
    return this.offers.decide(request.actor, request.offerId, request.approve, request.reason);
  }

  searchOffers({ actor, page, ...filters }: proto.SearchOffersRequest) {
    return this.offers.search(actor, filters, page);
  }

  getVisibleOffer(request: proto.OfferActionRequest) {
    return this.offers.getVisible(request.actor, request.offerId);
  }
}

@Controller()
@proto.OffersInternalServiceControllerMethods()
export class OffersInternalController implements proto.OffersInternalServiceController {
  constructor(private readonly offers: OffersService) {}

  getOfferSnapshot(request: proto.OfferIdRequest) {
    return this.offers.getSnapshot(request.offerId);
  }
}

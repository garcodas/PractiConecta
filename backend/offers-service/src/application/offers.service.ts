import { Inject, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, MoreThanOrEqual } from 'typeorm';
import {
  appTimeZone,
  assertUuid,
  conflict,
  forbidden,
  notFound,
  requireRole,
  todayIn,
  validationError,
  type ActorLike,
} from '../shared/common/index.js';
import { PAGE_SIZE, type offersProto } from '../shared/contracts/index.js';
import { recordEvent } from '../shared/outbox/index.js';
import { COMPANY_DIRECTORY, type CompanyDirectory } from '../domain/company-directory.js';
import { type OfferInput, type SearchFilters, validateFilters, validateOffer } from '../domain/offer-validation.js';
import { Offer } from '../infrastructure/offer.entity.js';

const OFFER_NOT_FOUND = 'La oferta no existe o ya no está disponible.';

const toProto = (offer: Offer): offersProto.Offer => ({
  id: offer.id,
  companyId: offer.companyId,
  companyName: offer.companyName,
  title: offer.title,
  description: offer.description,
  careerCode: offer.careerCode,
  modality: offer.modality,
  schedule: offer.schedule,
  deadline: offer.deadline,
  status: offer.status,
  rejectionReason: offer.rejectionReason ?? '',
  createdAt: offer.createdAt.toISOString(),
});

@Injectable()
export class OffersService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(COMPANY_DIRECTORY) private readonly companies: CompanyDirectory,
  ) {}

  private today() {
    return todayIn(appTimeZone());
  }

  private lock(manager: EntityManager, offerId: string) {
    return manager.findOne(Offer, { where: { id: offerId }, lock: { mode: 'pessimistic_write' } });
  }

  async create(actor: ActorLike | undefined, input: OfferInput): Promise<offersProto.Offer> {
    const company = requireRole(actor, 'COMPANY');
    const valid = validateOffer(input, this.today());

    const profile = await this.companies.getCompany(company.userId);
    if (profile.status !== 'APROBADA') {
      throw forbidden(
        profile.status === 'PENDIENTE'
          ? 'Tu empresa aún está pendiente de aprobación. Podrás publicar cuando la coordinación la apruebe.'
          : 'Tu empresa fue rechazada por la coordinación y no puede publicar ofertas.',
        'COMPANY_NOT_APPROVED',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const offer = await manager.save(
        manager.create(Offer, { ...valid, companyId: company.userId, companyName: profile.name, status: 'PENDIENTE' }),
      );
      await recordEvent(manager, 'offer.submitted', {
        offerId: offer.id,
        title: offer.title,
        companyId: offer.companyId,
        companyName: offer.companyName,
      });
      return toProto(offer);
    });
  }

  async listByCompany(actor: ActorLike | undefined): Promise<offersProto.OfferList> {
    const company = requireRole(actor, 'COMPANY');
    const items = await this.dataSource
      .getRepository(Offer)
      .find({ where: { companyId: company.userId }, order: { createdAt: 'DESC' } });
    return { items: items.map(toProto) };
  }

  async getOwned(actor: ActorLike | undefined, offerId: string): Promise<offersProto.Offer> {
    const company = requireRole(actor, 'COMPANY');
    assertUuid(offerId, OFFER_NOT_FOUND);
    const offer = await this.dataSource.getRepository(Offer).findOneBy({ id: offerId, companyId: company.userId });
    if (!offer) throw notFound(OFFER_NOT_FOUND);
    return toProto(offer);
  }

  async close(actor: ActorLike | undefined, offerId: string): Promise<offersProto.Offer> {
    const company = requireRole(actor, 'COMPANY');
    assertUuid(offerId, OFFER_NOT_FOUND);
    return this.dataSource.transaction(async (manager) => {
      const offer = await this.lock(manager, offerId);
      if (!offer || offer.companyId !== company.userId) throw notFound(OFFER_NOT_FOUND);
      if (offer.status !== 'APROBADA') {
        throw conflict('OFFER_NOT_CLOSABLE', 'Solo se puede cerrar una oferta aprobada.');
      }
      offer.status = 'CERRADA';
      offer.closedAt = new Date();
      return toProto(await manager.save(offer));
    });
  }

  async listPending(actor: ActorLike | undefined): Promise<offersProto.OfferList> {
    requireRole(actor, 'COORDINATOR');
    const items = await this.dataSource
      .getRepository(Offer)
      .find({ where: { status: 'PENDIENTE' }, order: { createdAt: 'ASC' } });
    return { items: items.map(toProto) };
  }

  async decide(
    actor: ActorLike | undefined,
    offerId: string,
    approve: boolean,
    reason: string,
  ): Promise<offersProto.Offer> {
    const coordinator = requireRole(actor, 'COORDINATOR');
    assertUuid(offerId, OFFER_NOT_FOUND);
    const motive = reason.trim();
    if (!approve && !motive) throw validationError({ reason: 'Indica el motivo del rechazo.' });

    return this.dataSource.transaction(async (manager) => {
      const offer = await this.lock(manager, offerId);
      if (!offer) throw notFound(OFFER_NOT_FOUND);
      if (offer.status !== 'PENDIENTE') throw conflict('OFFER_ALREADY_DECIDED', 'Esta oferta ya fue revisada.');

      offer.status = approve ? 'APROBADA' : 'RECHAZADA';
      offer.rejectionReason = approve ? null : motive;
      offer.reviewedBy = coordinator.userId;
      offer.reviewedAt = new Date();
      await manager.save(offer);

      const event = { offerId: offer.id, title: offer.title, companyId: offer.companyId };
      if (approve) await recordEvent(manager, 'offer.approved', event);
      else await recordEvent(manager, 'offer.rejected', { ...event, reason: motive });
      return toProto(offer);
    });
  }

  async search(
    actor: ActorLike | undefined,
    filters: SearchFilters,
    requestedPage: number,
  ): Promise<offersProto.OfferPage> {
    requireRole(actor, 'STUDENT');
    validateFilters(filters);
    const page = Math.max(1, requestedPage);
    const [items, total] = await this.dataSource.getRepository(Offer).findAndCount({
      where: {
        status: 'APROBADA',
        deadline: MoreThanOrEqual(this.today()),
        ...(filters.careerCode ? { careerCode: filters.careerCode as Offer['careerCode'] } : {}),
        ...(filters.modality ? { modality: filters.modality as Offer['modality'] } : {}),
        ...(filters.schedule ? { schedule: filters.schedule as Offer['schedule'] } : {}),
      },
      order: { deadline: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return { items: items.map(toProto), total, page, pageSize: PAGE_SIZE };
  }

  async getVisible(actor: ActorLike | undefined, offerId: string): Promise<offersProto.Offer> {
    requireRole(actor, 'STUDENT');
    assertUuid(offerId, OFFER_NOT_FOUND);
    const offer = await this.dataSource.getRepository(Offer).findOneBy({
      id: offerId,
      status: 'APROBADA',
      deadline: MoreThanOrEqual(this.today()),
    });
    if (!offer) throw notFound(OFFER_NOT_FOUND);
    return toProto(offer);
  }

  async getSnapshot(offerId: string): Promise<offersProto.OfferSnapshot> {
    assertUuid(offerId, OFFER_NOT_FOUND);
    const offer = await this.dataSource.getRepository(Offer).findOneBy({ id: offerId });
    if (!offer) throw notFound(OFFER_NOT_FOUND);
    const { id, companyId, companyName, title, status, deadline } = offer;
    return { id, companyId, companyName, title, status, deadline };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { appTimeZone, assertUuid, conflict, isUuid, notFound, requireRole, todayIn, validationError, type ActorLike } from '../shared/common/index.js';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../shared/contracts/index.js';
import { Application } from '../domain/application.js';
import { APPLICATION_REPOSITORY, type ApplicationRepository } from '../domain/ports/application-repository.js';
import { OFFER_READER, type OfferReader } from '../domain/ports/offer-reader.js';

const APPLICATION_NOT_FOUND = 'La postulación no existe.';
const OFFER_NOT_FOUND = 'La oferta no existe o ya no está disponible.';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly repository: ApplicationRepository,
    @Inject(OFFER_READER) private readonly offers: OfferReader,
  ) {}

  /**
   * La postulación se confirma después del commit, nunca antes (RNF-05). La
   * unicidad la garantiza la base de datos, también ante peticiones simultáneas.
   */
  async submit(actor: ActorLike | undefined, offerId: string): Promise<Application> {
    const student = requireRole(actor, 'STUDENT');
    assertUuid(offerId, OFFER_NOT_FOUND);

    const offer = await this.offers.getSnapshot(offerId);
    if (offer.status === 'CERRADA') throw conflict('OFFER_CLOSED', 'Esta oferta está cerrada y ya no recibe postulaciones.');
    if (offer.status !== 'APROBADA') throw notFound(OFFER_NOT_FOUND);
    if (offer.deadline < todayIn(appTimeZone())) {
      throw conflict('OFFER_EXPIRED', 'La fecha límite de esta oferta ya pasó.');
    }

    const { application, firstChange } = Application.submit({
      offerId,
      studentId: student.userId,
      companyId: offer.companyId,
      offerTitle: offer.title,
      companyName: offer.companyName,
    });
    await this.repository.insert(application, firstChange, {
      type: 'application.submitted',
      data: {
        applicationId: application.id,
        offerId,
        offerTitle: offer.title,
        companyId: offer.companyId,
        studentId: student.userId,
      },
    });
    return application;
  }

  listMine(actor: ActorLike | undefined) {
    return this.repository.listByStudent(requireRole(actor, 'STUDENT').userId);
  }

  async getMine(actor: ActorLike | undefined, applicationId: string) {
    const student = requireRole(actor, 'STUDENT');
    assertUuid(applicationId, APPLICATION_NOT_FOUND);
    const application = await this.repository.findByStudent(applicationId, student.userId);
    if (!application) throw notFound(APPLICATION_NOT_FOUND);
    return { application, history: await this.repository.history(applicationId) };
  }

  async findMineByOffer(actor: ActorLike | undefined, offerId: string) {
    const student = requireRole(actor, 'STUDENT');
    assertUuid(offerId, OFFER_NOT_FOUND);
    return this.repository.findByStudentAndOffer(student.userId, offerId);
  }

  async listByOffer(actor: ActorLike | undefined, offerId: string) {
    const company = requireRole(actor, 'COMPANY');
    assertUuid(offerId, OFFER_NOT_FOUND);
    return this.repository.listByOffer(company.userId, offerId);
  }

  async changeStatus(actor: ActorLike | undefined, applicationId: string, toStatus: string): Promise<Application> {
    const company = requireRole(actor, 'COMPANY');
    assertUuid(applicationId, APPLICATION_NOT_FOUND);
    if (!(toStatus in APPLICATION_STATUSES)) throw validationError({ status: 'El estado no es válido.' });

    return this.repository.transaction(async (tx) => {
      const application = await tx.findForUpdate(applicationId, company.userId);
      if (!application) throw notFound(APPLICATION_NOT_FOUND);
      const change = application.changeStatus(toStatus as ApplicationStatus, company.userId);
      await tx.update(application, change, {
        type: 'application.status_changed',
        data: {
          applicationId,
          offerId: application.offerId,
          offerTitle: application.offerTitle,
          companyName: application.companyName,
          studentId: application.studentId,
          fromStatus: change.fromStatus as ApplicationStatus,
          toStatus: change.toStatus,
        },
      });
      return application;
    });
  }

  countByOffers(actor: ActorLike | undefined, offerIds: string[]) {
    const company = requireRole(actor, 'COMPANY');
    return this.repository.countByOffers(company.userId, offerIds.filter(isUuid));
  }
}

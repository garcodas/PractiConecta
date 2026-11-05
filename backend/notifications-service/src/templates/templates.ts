import { APPLICATION_STATUSES, type EventEnvelope } from '../shared/contracts/index.js';
import type { NotificationTemplate, RecipientDirectory } from '../domain/notification-template.js';

class OfferSubmittedTemplate implements NotificationTemplate<'offer.submitted'> {
  readonly type = 'offer.submitted';
  recipients(_event: EventEnvelope<'offer.submitted'>, directory: RecipientDirectory) {
    return directory.listUserIdsByRole('COORDINATOR');
  }
  render({ data }: EventEnvelope<'offer.submitted'>) {
    return {
      title: 'Nueva oferta por revisar',
      body: `${data.companyName} envió "${data.title}" para aprobación.`,
      link: '/coordinador/aprobaciones',
    };
  }
}

class OfferApprovedTemplate implements NotificationTemplate<'offer.approved'> {
  readonly type = 'offer.approved';
  recipients({ data }: EventEnvelope<'offer.approved'>) {
    return [data.companyId];
  }
  render({ data }: EventEnvelope<'offer.approved'>) {
    return {
      title: 'Oferta aprobada',
      body: `"${data.title}" ya es visible para los estudiantes.`,
      link: '/empresa/ofertas',
    };
  }
}

class OfferRejectedTemplate implements NotificationTemplate<'offer.rejected'> {
  readonly type = 'offer.rejected';
  recipients({ data }: EventEnvelope<'offer.rejected'>) {
    return [data.companyId];
  }
  render({ data }: EventEnvelope<'offer.rejected'>) {
    return {
      title: 'Oferta rechazada',
      body: `"${data.title}" fue rechazada. Motivo: ${data.reason}`,
      link: '/empresa/ofertas',
    };
  }
}

class CompanyApprovedTemplate implements NotificationTemplate<'company.approved'> {
  readonly type = 'company.approved';
  recipients({ data }: EventEnvelope<'company.approved'>) {
    return [data.companyId];
  }
  render() {
    return {
      title: 'Empresa aprobada',
      body: 'La coordinación aprobó tu empresa. Ya puedes publicar ofertas.',
      link: '/empresa/ofertas/nueva',
    };
  }
}

class CompanyRejectedTemplate implements NotificationTemplate<'company.rejected'> {
  readonly type = 'company.rejected';
  recipients({ data }: EventEnvelope<'company.rejected'>) {
    return [data.companyId];
  }
  render({ data }: EventEnvelope<'company.rejected'>) {
    return {
      title: 'Empresa rechazada',
      body: `La coordinación rechazó tu empresa. Motivo: ${data.reason}`,
      link: '/empresa/ofertas',
    };
  }
}

class ApplicationSubmittedTemplate implements NotificationTemplate<'application.submitted'> {
  readonly type = 'application.submitted';
  recipients({ data }: EventEnvelope<'application.submitted'>) {
    return [data.companyId];
  }
  render({ data }: EventEnvelope<'application.submitted'>) {
    return {
      title: 'Nueva postulación',
      body: `Recibiste una postulación para "${data.offerTitle}".`,
      link: `/empresa/ofertas/${data.offerId}/postulantes`,
    };
  }
}

class ApplicationStatusChangedTemplate implements NotificationTemplate<'application.status_changed'> {
  readonly type = 'application.status_changed';
  recipients({ data }: EventEnvelope<'application.status_changed'>) {
    return [data.studentId];
  }
  render({ data }: EventEnvelope<'application.status_changed'>) {
    return {
      title: `Tu postulación pasó a ${APPLICATION_STATUSES[data.toStatus]}`,
      body: `"${data.offerTitle}" en ${data.companyName}.`,
      link: `/estudiante/postulaciones/${data.applicationId}`,
    };
  }
}

/** Único punto a tocar para agregar un tipo de notificación. */
export const TEMPLATES: NotificationTemplate<any>[] = [
  new OfferSubmittedTemplate(),
  new OfferApprovedTemplate(),
  new OfferRejectedTemplate(),
  new CompanyApprovedTemplate(),
  new CompanyRejectedTemplate(),
  new ApplicationSubmittedTemplate(),
  new ApplicationStatusChangedTemplate(),
];

import { conflict } from '../../shared/common/index.js';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../../shared/contracts/index.js';

/**
 * Patrón Estado: cada estado sabe a qué estados puede pasar. Evita repartir
 * condicionales sobre el estado por los casos de uso.
 */
export abstract class ApplicationState {
  abstract readonly status: ApplicationStatus;
  protected abstract readonly next: readonly ApplicationStatus[];

  get allowedTransitions(): readonly ApplicationStatus[] {
    return this.next;
  }

  get isFinal(): boolean {
    return this.next.length === 0;
  }

  transitionTo(target: ApplicationStatus): ApplicationState {
    if (!this.next.includes(target)) {
      throw conflict(
        this.isFinal ? 'APPLICATION_FINAL' : 'INVALID_TRANSITION',
        this.isFinal
          ? `La postulación ya está ${APPLICATION_STATUSES[this.status]} y no admite más cambios.`
          : `No se puede pasar de ${APPLICATION_STATUSES[this.status]} a ${APPLICATION_STATUSES[target]}.`,
      );
    }
    return stateOf(target);
  }
}

class Enviada extends ApplicationState {
  readonly status = 'ENVIADA';
  protected readonly next = ['EN_REVISION', 'RECHAZADA'] as const;
}

class EnRevision extends ApplicationState {
  readonly status = 'EN_REVISION';
  protected readonly next = ['ENTREVISTA', 'RECHAZADA'] as const;
}

class Entrevista extends ApplicationState {
  readonly status = 'ENTREVISTA';
  protected readonly next = ['ACEPTADA', 'RECHAZADA'] as const;
}

class Aceptada extends ApplicationState {
  readonly status = 'ACEPTADA';
  protected readonly next = [] as const;
}

class Rechazada extends ApplicationState {
  readonly status = 'RECHAZADA';
  protected readonly next = [] as const;
}

const STATES: Record<ApplicationStatus, ApplicationState> = {
  ENVIADA: new Enviada(),
  EN_REVISION: new EnRevision(),
  ENTREVISTA: new Entrevista(),
  ACEPTADA: new Aceptada(),
  RECHAZADA: new Rechazada(),
};

export function stateOf(status: ApplicationStatus): ApplicationState {
  return STATES[status];
}

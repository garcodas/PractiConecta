import type { EventDataMap } from '../../shared/contracts/index.js';
import type { Application, StatusChange } from '../application.js';

export const APPLICATION_REPOSITORY = Symbol('APPLICATION_REPOSITORY');

export type ApplicationEvent =
  | { type: 'application.submitted'; data: EventDataMap['application.submitted'] }
  | { type: 'application.status_changed'; data: EventDataMap['application.status_changed'] };

/** Operaciones atómicas: el estado, el historial y el evento se guardan juntos. */
export interface ApplicationTransaction {
  findForUpdate(applicationId: string, companyId: string): Promise<Application | null>;
  update(application: Application, change: StatusChange, event: ApplicationEvent): Promise<void>;
}

export interface ApplicationRepository {
  /** Lanza un conflicto si el estudiante ya se postuló a esa oferta. */
  insert(application: Application, change: StatusChange, event: ApplicationEvent): Promise<void>;
  transaction<T>(work: (tx: ApplicationTransaction) => Promise<T>): Promise<T>;
  listByStudent(studentId: string): Promise<Application[]>;
  findByStudent(applicationId: string, studentId: string): Promise<Application | null>;
  findByStudentAndOffer(studentId: string, offerId: string): Promise<Application | null>;
  listByOffer(companyId: string, offerId: string): Promise<Application[]>;
  history(applicationId: string): Promise<StatusChange[]>;
  countByOffers(companyId: string, offerIds: string[]): Promise<Map<string, number>>;
}

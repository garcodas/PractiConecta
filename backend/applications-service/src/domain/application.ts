import { randomUUID } from 'node:crypto';
import type { ApplicationStatus } from '../shared/contracts/index.js';
import { stateOf } from './state/application-state.js';

export interface StatusChange {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedBy: string;
  changedAt: Date;
}

export interface ApplicationData {
  id: string;
  offerId: string;
  studentId: string;
  companyId: string;
  offerTitle: string;
  companyName: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Postulación: no depende de TypeORM ni de gRPC (PID). */
export class Application implements ApplicationData {
  id: string;
  offerId: string;
  studentId: string;
  companyId: string;
  offerTitle: string;
  companyName: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: ApplicationData) {
    Object.assign(this, data);
  }

  static submit(input: Pick<ApplicationData, 'offerId' | 'studentId' | 'companyId' | 'offerTitle' | 'companyName'>) {
    const now = new Date();
    const application = new Application({ ...input, id: randomUUID(), status: 'ENVIADA', createdAt: now, updatedAt: now });
    const firstChange: StatusChange = { fromStatus: null, toStatus: 'ENVIADA', changedBy: input.studentId, changedAt: now };
    return { application, firstChange };
  }

  changeStatus(target: ApplicationStatus, changedBy: string): StatusChange {
    const fromStatus = this.status;
    this.status = stateOf(fromStatus).transitionTo(target).status;
    this.updatedAt = new Date();
    return { fromStatus, toStatus: this.status, changedBy, changedAt: this.updatedAt };
  }
}

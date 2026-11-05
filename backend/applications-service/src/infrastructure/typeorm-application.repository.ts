import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In, QueryFailedError } from 'typeorm';
import { conflict } from '../shared/common/index.js';
import { recordEvent } from '../shared/outbox/index.js';
import { Application, type StatusChange } from '../domain/application.js';
import type {
  ApplicationEvent,
  ApplicationRepository,
  ApplicationTransaction,
} from '../domain/ports/application-repository.js';
import { ApplicationRow, StatusHistoryRow } from './entities.js';

const PG_UNIQUE_VIOLATION = '23505';

const toDomain = (row: ApplicationRow) => new Application({ ...row });

const persistChange = async (
  manager: EntityManager,
  application: Application,
  change: StatusChange,
  event: ApplicationEvent,
) => {
  await manager.insert(StatusHistoryRow, { ...change, applicationId: application.id });
  if (event.type === 'application.submitted') await recordEvent(manager, event.type, event.data);
  else await recordEvent(manager, event.type, event.data);
};

@Injectable()
export class TypeOrmApplicationRepository implements ApplicationRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get rows() {
    return this.dataSource.getRepository(ApplicationRow);
  }

  async insert(application: Application, change: StatusChange, event: ApplicationEvent) {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(ApplicationRow, { ...application });
        await persistChange(manager, application, change, event);
      });
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw conflict('ALREADY_APPLIED', 'Ya te postulaste a esta oferta.');
      }
      throw error;
    }
  }

  transaction<T>(work: (tx: ApplicationTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        findForUpdate: async (id, companyId) => {
          // El bloqueo serializa cambios simultáneos sobre la misma postulación.
          const row = await manager.findOne(ApplicationRow, {
            where: { id, companyId },
            lock: { mode: 'pessimistic_write' },
          });
          return row && toDomain(row);
        },
        update: async (application, change, event) => {
          await manager.update(ApplicationRow, application.id, {
            status: application.status,
            updatedAt: application.updatedAt,
          });
          await persistChange(manager, application, change, event);
        },
      }),
    );
  }

  async listByStudent(studentId: string) {
    const rows = await this.rows.find({ where: { studentId }, order: { updatedAt: 'DESC' } });
    return rows.map(toDomain);
  }

  async findByStudent(id: string, studentId: string) {
    const row = await this.rows.findOneBy({ id, studentId });
    return row && toDomain(row);
  }

  async findByStudentAndOffer(studentId: string, offerId: string) {
    const row = await this.rows.findOneBy({ studentId, offerId });
    return row && toDomain(row);
  }

  async listByOffer(companyId: string, offerId: string) {
    const rows = await this.rows.find({ where: { companyId, offerId }, order: { createdAt: 'ASC' } });
    return rows.map(toDomain);
  }

  history(applicationId: string): Promise<StatusChange[]> {
    return this.dataSource
      .getRepository(StatusHistoryRow)
      .find({ where: { applicationId }, order: { changedAt: 'ASC' } });
  }

  async countByOffers(companyId: string, offerIds: string[]) {
    if (offerIds.length === 0) return new Map<string, number>();
    const rows = await this.rows
      .createQueryBuilder('application')
      .select('application.offerId', 'offerId')
      .addSelect('COUNT(*)::int', 'count')
      .where({ companyId, offerId: In(offerIds) })
      .groupBy('application.offerId')
      .getRawMany<{ offerId: string; count: number }>();
    return new Map(rows.map((row) => [row.offerId, row.count]));
  }
}

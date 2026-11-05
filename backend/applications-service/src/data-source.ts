import { DataSource } from 'typeorm';
import { postgresOptions } from './shared/common/index.js';
import { OutboxEvent } from './shared/outbox/index.js';
import { ApplicationRow, StatusHistoryRow } from './infrastructure/entities.js';
import { migrations } from './migrations/index.js';

export const entities = [ApplicationRow, StatusHistoryRow, OutboxEvent];

export const createDataSource = (url = process.env.DATABASE_URL) =>
  new DataSource(postgresOptions(url, entities, migrations));

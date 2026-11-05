import { DataSource } from 'typeorm';
import { postgresOptions } from './shared/common/index.js';
import { Notification } from './infrastructure/notification.entity.js';
import { migrations } from './migrations/index.js';

export const entities = [Notification];

export const createDataSource = (url = process.env.DATABASE_URL) =>
  new DataSource(postgresOptions(url, entities, migrations));

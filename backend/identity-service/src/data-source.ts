import { DataSource } from 'typeorm';
import { postgresOptions } from './shared/common/index.js';
import { OutboxEvent } from './shared/outbox/index.js';
import { CompanyProfile, Skill, StudentProfile, User } from './infrastructure/entities.js';
import { migrations } from './migrations/index.js';

export const entities = [User, Skill, StudentProfile, CompanyProfile, OutboxEvent];

export const createDataSource = (url = process.env.DATABASE_URL) =>
  new DataSource(postgresOptions(url, entities, migrations));

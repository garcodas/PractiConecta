import type { DataSource } from 'typeorm';

/** URL de la base de pruebas de integración de un servicio. */
export const testDatabaseUrl = (service: 'identity' | 'offers' | 'applications' | 'notifications') =>
  `postgres://${service}_svc:${service}_pw@${process.env.TEST_DB_HOST ?? 'localhost:55432'}/${service}_test`;

export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:56379';

/** Base limpia con migraciones aplicadas; comprueba que coincide con las entidades. */
export async function freshDatabase(ds: DataSource) {
  if (!ds.isInitialized) await ds.initialize();
  await ds.query('DROP SCHEMA public CASCADE');
  await ds.query('CREATE SCHEMA public');
  await ds.runMigrations();
  const { upQueries } = await ds.driver.createSchemaBuilder().log();
  if (upQueries.length > 0) {
    throw new Error(`Migraciones y entidades difieren: ${upQueries.map((q) => q.query).join('; ')}`);
  }
}

/** Revierte y reaplica todas las migraciones del servicio. */
export async function assertMigrationsReversible(ds: DataSource) {
  for (let i = 0; i < ds.migrations.length; i++) await ds.undoLastMigration();
  const tables = await ds.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (tables.length > 0) throw new Error(`Quedaron tablas tras revertir: ${JSON.stringify(tables)}`);
  await ds.runMigrations();
}

export async function truncateAll(ds: DataSource) {
  const tables = ds.entityMetadatas.map((meta) => `"${meta.tableName}"`).join(', ');
  await ds.query(`TRUNCATE ${tables} CASCADE`);
}

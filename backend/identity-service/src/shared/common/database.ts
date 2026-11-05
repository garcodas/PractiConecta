import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';

export function postgresOptions(url: string | undefined, entities: Function[], migrations: Function[]): DataSourceOptions {
  if (!url) throw new Error('Falta DATABASE_URL');
  return {
    type: 'postgres',
    url,
    entities,
    migrations,
    // El esquema solo cambia con migraciones (ver design.md, D5).
    synchronize: false,
    migrationsRun: false,
    // gen_random_uuid() viene incluido en PostgreSQL; los roles de servicio no crean extensiones.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    logging: ['error'],
  };
}

/** CLI de migraciones de un servicio: `up` (por defecto) o `down`. */
export async function runMigrationCli(dataSource: DataSource, direction = process.argv[2] ?? 'up') {
  await dataSource.initialize();
  try {
    if (direction === 'down') {
      await dataSource.undoLastMigration();
      console.log('Última migración revertida');
    } else {
      const applied = await dataSource.runMigrations({ transaction: 'each' });
      console.log(`Migraciones aplicadas: ${applied.length}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

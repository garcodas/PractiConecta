// Genera una migración comparando las entidades compiladas con la base indicada.
// Uso: DATABASE_URL=... pnpm migration:generate <Nombre>
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [name] = process.argv.slice(2);
const { createDataSource } = await import(resolve('dist/data-source.js'));
const ds = createDataSource();
await ds.initialize();
const { upQueries, downQueries } = await ds.driver.createSchemaBuilder().log();
await ds.destroy();

if (upQueries.length === 0) {
  console.log('Sin cambios de esquema');
  process.exit(0);
}

const className = `${name}${Date.now()}`;
const line = (query) => `    await queryRunner.query(${JSON.stringify(query.query)});`;
writeFileSync(
  resolve(`src/migrations/${className}.ts`),
  `import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ${className} implements MigrationInterface {
  name = '${className}';

  async up(queryRunner: QueryRunner): Promise<void> {
${upQueries.map(line).join('\n')}
  }

  async down(queryRunner: QueryRunner): Promise<void> {
${[...downQueries].reverse().map(line).join('\n')}
  }
}
`,
);
console.log(`Migración ${className}: ${upQueries.length} sentencias`);

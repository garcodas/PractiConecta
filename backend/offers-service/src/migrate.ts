import { runMigrationCli } from './shared/common/index.js';
import { createDataSource } from './data-source.js';

await runMigrationCli(createDataSource());

import { defineConfig } from 'vitest/config';

// Pruebas e2e: recorren la API contra el `docker compose` completo.
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.spec.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});

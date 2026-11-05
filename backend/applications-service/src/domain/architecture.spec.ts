import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );

describe('capa de dominio (PID)', () => {
  it('no importa TypeORM, gRPC ni la infraestructura', () => {
    const domain = files(import.meta.dirname).filter((file) => !file.endsWith('.spec.ts'));
    expect(domain.length).toBeGreaterThan(0);
    for (const file of domain) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/from '(typeorm|@grpc|@nestjs|.*infrastructure)/);
    }
  });
});

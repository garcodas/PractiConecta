// Genera los tipos TypeScript de los contratos gRPC en src/gen, solo desde proto/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const protoDir = resolve('proto');
const outDir = resolve('src/gen');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const options = [
  'nestJs=true',
  'addGrpcMetadata=false',
  'snakeToCamel=keys',
  'importSuffix=.js',
  'esModuleInterop=true',
  'exportCommonSymbols=false',
].join(',');

execFileSync(
  resolve('node_modules/.bin/grpc_tools_node_protoc'),
  [
    `--plugin=protoc-gen-ts_proto=${resolve('node_modules/.bin/protoc-gen-ts_proto')}`,
    `--ts_proto_out=${outDir}`,
    `--ts_proto_opt=${options}`,
    `--proto_path=${protoDir}`,
    ...readdirSync(protoDir).filter((f) => f.endsWith('.proto')).map((f) => resolve(protoDir, f)),
  ],
  { stdio: 'inherit' },
);

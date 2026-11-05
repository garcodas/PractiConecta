import { type ArgumentsHost, Catch, Logger, type RpcExceptionFilter } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { type ClientProviderOptions, type GrpcOptions, Transport } from '@nestjs/microservices';
import { firstValueFrom, type Observable, throwError, timeout, TimeoutError } from 'rxjs';
import { resolve } from 'node:path';
import { DomainError, type ErrorKind, unavailable } from './errors.js';

// Funciona igual desde src/shared/common y desde dist/shared/common.
const PROTO_DIR = process.env.PROTO_DIR ?? resolve(import.meta.dirname, '../../../proto');

export const GRPC_DEADLINE_MS = 3000;

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  VALIDATION: GrpcStatus.INVALID_ARGUMENT,
  UNAUTHENTICATED: GrpcStatus.UNAUTHENTICATED,
  FORBIDDEN: GrpcStatus.PERMISSION_DENIED,
  NOT_FOUND: GrpcStatus.NOT_FOUND,
  CONFLICT: GrpcStatus.FAILED_PRECONDITION,
  UNAVAILABLE: GrpcStatus.UNAVAILABLE,
  INTERNAL: GrpcStatus.INTERNAL,
};

const HTTP_BY_KIND: Record<ErrorKind, number> = {
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export const httpStatusFor = (kind: ErrorKind) => HTTP_BY_KIND[kind];

/** Serializa un error de dominio en los detalles de una llamada gRPC. */
export function encodeGrpcError(error: unknown): { code: number; message: string } {
  const domain =
    error instanceof DomainError
      ? error
      : new DomainError('INTERNAL', 'INTERNAL', 'Ocurrió un error inesperado. Intenta de nuevo.');
  const { kind, code, message, fields } = domain;
  return { code: STATUS_BY_KIND[kind], message: JSON.stringify({ kind, code, message, fields }) };
}

/** Reconstruye el error de dominio en quien hizo la llamada gRPC. */
export function decodeGrpcError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (error instanceof TimeoutError) return unavailable();
  const details = (error as { details?: unknown }).details;
  if (typeof details === 'string' && details.startsWith('{')) {
    try {
      const parsed = JSON.parse(details) as Pick<DomainError, 'kind' | 'code' | 'message' | 'fields'>;
      if (parsed.kind && parsed.code) {
        return new DomainError(parsed.kind, parsed.code, parsed.message, parsed.fields);
      }
    } catch {
      // Los detalles no eran un error de dominio: se trata como fallo de transporte.
    }
  }
  return unavailable();
}

@Catch()
export class GrpcExceptionFilter implements RpcExceptionFilter<unknown> {
  private readonly logger = new Logger('gRPC');

  catch(error: unknown, _host: ArgumentsHost) {
    if (!(error instanceof DomainError)) this.logger.error(error);
    return throwError(() => encodeGrpcError(error));
  }
}

/** Ejecuta una llamada gRPC con plazo máximo y traduce sus errores. */
export async function callGrpc<T>(call: Observable<T>): Promise<T> {
  try {
    return await firstValueFrom(call.pipe(timeout(GRPC_DEADLINE_MS)));
  } catch (error) {
    throw decodeGrpcError(error);
  }
}

const LOADER = {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
  arrays: true,
  includeDirs: [PROTO_DIR],
};

export interface GrpcContract {
  /** Paquete proto, por ejemplo `practiconecta.offers`. */
  package: string;
  /** Archivo en proto/. */
  protoFile: string;
}

export const GRPC_CONTRACTS = {
  identity: { package: 'practiconecta.identity', protoFile: 'identity.proto' },
} as const satisfies Record<string, GrpcContract>;

export function grpcServerOptions(contract: GrpcContract, url: string): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      package: contract.package,
      protoPath: resolve(PROTO_DIR, contract.protoFile),
      url,
      loader: LOADER,
    },
  };
}

export function grpcClientOptions(token: string, contract: GrpcContract, url: string): ClientProviderOptions {
  return { name: token, ...grpcServerOptions(contract, url) };
}

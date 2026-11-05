import 'reflect-metadata';
import { Controller, Inject, Module, UseFilters } from '@nestjs/common';
import { ClientsModule, GrpcMethod, type ClientGrpc, type MicroserviceOptions } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { of, NEVER } from 'rxjs';
import { conflict, DomainError, validationError } from './errors.js';
import { callGrpc, GRPC_CONTRACTS, GrpcExceptionFilter, grpcClientOptions, grpcServerOptions } from './grpc.js';
import type { INestMicroservice } from '@nestjs/common';

const URL = '127.0.0.1:50999';

@Controller()
@UseFilters(GrpcExceptionFilter)
class Fake {
  @GrpcMethod('OffersInternalService', 'GetOfferSnapshot')
  async handle({ offerId: value }: { offerId: string }) {
    if (value === 'conflict') throw conflict('X', 'Conflicto de prueba');
    if (value === 'fields') throw validationError({ title: 'Obligatorio' });
    if (value === 'boom') throw new Error('secreto interno');
    return { id: value, companyId: 'c', companyName: 'n', title: 'Título', status: 'APROBADA', deadline: '2026-11-10' };
  }
}

@Module({ controllers: [Fake] })
class FakeModule {}

describe('transporte gRPC', () => {
  let server: INestMicroservice;
  let client: { getOfferSnapshot(request: object): any };
  let close: () => Promise<void>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [FakeModule] }).compile();
    server = moduleRef.createNestMicroservice<MicroserviceOptions>(grpcServerOptions(GRPC_CONTRACTS.offers, URL));
    await server.listen();
    const clientRef = await Test.createTestingModule({
      imports: [ClientsModule.register([grpcClientOptions('C', GRPC_CONTRACTS.offers, URL)])],
    }).compile();
    await clientRef.init();
    client = clientRef.get<ClientGrpc>('C').getService('OffersInternalService');
    close = async () => {
      await clientRef.close();
      await server.close();
    };
  });

  afterAll(() => close());

  it('devuelve la respuesta en camelCase', async () => {
    const result = await callGrpc<any>(client.getOfferSnapshot({ offerId: 'n1' }));
    expect(result).toMatchObject({ id: 'n1' });
  });

  it('conserva tipo, código y mensaje del error de dominio', async () => {
    const error: any = await callGrpc(client.getOfferSnapshot({ offerId: 'conflict' })).catch((e) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ kind: 'CONFLICT', code: 'X', message: 'Conflicto de prueba' });
  });

  it('conserva los errores por campo', async () => {
    const error: any = await callGrpc(client.getOfferSnapshot({ offerId: 'fields' })).catch((e) => e);
    expect(error).toMatchObject({ kind: 'VALIDATION', fields: { title: 'Obligatorio' } });
  });

  it('no filtra detalles internos', async () => {
    const error: any = await callGrpc(client.getOfferSnapshot({ offerId: 'boom' })).catch((e) => e);
    expect(error.kind).toBe('INTERNAL');
    expect(error.message).not.toContain('secreto');
  });

  it('traduce un servidor caído y un plazo vencido a UNAVAILABLE', async () => {
    const down = await Test.createTestingModule({
      imports: [ClientsModule.register([grpcClientOptions('D', GRPC_CONTRACTS.offers, '127.0.0.1:1')])],
    }).compile();
    await down.init();
    const dead = down.get<ClientGrpc>('D').getService<any>('OffersInternalService');
    const error: any = await callGrpc(dead.getOfferSnapshot({ offerId: 'x' })).catch((e) => e);
    expect(error.kind).toBe('UNAVAILABLE');
    await down.close();
    await expect(callGrpc(of(1))).resolves.toBe(1);
    await expect(callGrpc(NEVER)).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
  }, 10_000);
});

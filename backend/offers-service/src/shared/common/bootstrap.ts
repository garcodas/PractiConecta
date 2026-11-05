import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { GrpcExceptionFilter, type GrpcContract, grpcServerOptions } from './grpc.js';

/** Arranque común de un microservicio gRPC. */
export async function bootstrapGrpcService(module: unknown, contract: GrpcContract, url: string) {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(module as never, grpcServerOptions(contract, url));
  app.useGlobalFilters(new GrpcExceptionFilter());
  app.enableShutdownHooks();
  await app.listen();
  new Logger('Bootstrap').log(`${contract.package} escuchando en ${url}`);
}

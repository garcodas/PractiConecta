import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GRPC_CONTRACTS, grpcClientOptions, postgresOptions } from './shared/common/index.js';
import { OutboxModule } from './shared/outbox/index.js';
import { OffersService } from './application/offers.service.js';
import { entities } from './data-source.js';
import { COMPANY_DIRECTORY } from './domain/company-directory.js';
import { GrpcCompanyDirectory, IDENTITY_CLIENT } from './infrastructure/grpc-company-directory.js';
import { migrations } from './migrations/index.js';
import { OffersController, OffersInternalController } from './transport/offers.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => postgresOptions(process.env.DATABASE_URL, entities, migrations) }),
    ClientsModule.register([
      grpcClientOptions(IDENTITY_CLIENT, GRPC_CONTRACTS.identity, process.env.IDENTITY_GRPC_URL ?? 'localhost:50051'),
    ]),
    OutboxModule,
  ],
  controllers: [OffersController, OffersInternalController],
  providers: [OffersService, { provide: COMPANY_DIRECTORY, useClass: GrpcCompanyDirectory }],
})
export class AppModule {}

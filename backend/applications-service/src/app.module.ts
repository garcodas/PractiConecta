import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GRPC_CONTRACTS, grpcClientOptions, postgresOptions } from './shared/common/index.js';
import { OutboxModule } from './shared/outbox/index.js';
import { ApplicationsService } from './application/applications.service.js';
import { entities } from './data-source.js';
import { APPLICATION_REPOSITORY } from './domain/ports/application-repository.js';
import { OFFER_READER } from './domain/ports/offer-reader.js';
import { GrpcOfferReader, OFFERS_CLIENT } from './infrastructure/grpc-offer-reader.js';
import { TypeOrmApplicationRepository } from './infrastructure/typeorm-application.repository.js';
import { migrations } from './migrations/index.js';
import { ApplicationsController } from './transport/applications.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => postgresOptions(process.env.DATABASE_URL, entities, migrations) }),
    ClientsModule.register([
      grpcClientOptions(OFFERS_CLIENT, GRPC_CONTRACTS.offers, process.env.OFFERS_GRPC_URL ?? 'localhost:50052'),
    ]),
    OutboxModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    { provide: APPLICATION_REPOSITORY, useClass: TypeOrmApplicationRepository },
    { provide: OFFER_READER, useClass: GrpcOfferReader },
  ],
})
export class AppModule {}

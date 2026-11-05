import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GRPC_CONTRACTS, grpcClientOptions, postgresOptions } from './shared/common/index.js';
import { EventProcessor } from './application/event-processor.js';
import { NotificationsService } from './application/notifications.service.js';
import { entities } from './data-source.js';
import { NOTIFICATION_TEMPLATES, RECIPIENT_DIRECTORY } from './domain/notification-template.js';
import { EventsWorker } from './infrastructure/events-worker.js';
import { GrpcRecipientDirectory, IDENTITY_CLIENT } from './infrastructure/grpc-recipient-directory.js';
import { migrations } from './migrations/index.js';
import { TEMPLATES } from './templates/templates.js';
import { NotificationsController } from './transport/notifications.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => postgresOptions(process.env.DATABASE_URL, entities, migrations) }),
    ClientsModule.register([
      grpcClientOptions(IDENTITY_CLIENT, GRPC_CONTRACTS.identity, process.env.IDENTITY_GRPC_URL ?? 'localhost:50051'),
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EventProcessor,
    EventsWorker,
    { provide: NOTIFICATION_TEMPLATES, useValue: TEMPLATES },
    { provide: RECIPIENT_DIRECTORY, useClass: GrpcRecipientDirectory },
  ],
})
export class AppModule {}

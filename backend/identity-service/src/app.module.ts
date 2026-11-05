import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresOptions } from './shared/common/index.js';
import { OutboxModule } from './shared/outbox/index.js';
import { IdentityService } from './application/identity.service.js';
import { entities } from './data-source.js';
import { migrations } from './migrations/index.js';
import { IdentityController, IdentityInternalController } from './transport/identity.controller.js';

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: () => postgresOptions(process.env.DATABASE_URL, entities, migrations) }), OutboxModule],
  controllers: [IdentityController, IdentityInternalController],
  providers: [IdentityService],
})
export class AppModule {}

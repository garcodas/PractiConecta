import { Module } from '@nestjs/common';
import { BullMqEventBus, EVENT_BUS } from './event-bus.js';
import { OutboxPublisher } from './outbox-publisher.js';

@Module({
  providers: [
    { provide: EVENT_BUS, useFactory: () => new BullMqEventBus(process.env.REDIS_URL ?? 'redis://localhost:6379') },
    OutboxPublisher,
  ],
})
export class OutboxModule {}

// Inspecciona y reprocesa los eventos que agotaron sus intentos.
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './shared/contracts/index.js';
import { redisConnection } from './shared/queue.js';

const queue = new Queue(NOTIFICATIONS_QUEUE, {
  connection: redisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379'),
});
const failed = await queue.getFailed();
for (const job of failed) {
  console.log(`${job.id} ${job.name}: ${job.failedReason}`);
  await job.retry();
}
console.log(`Eventos reprocesados: ${failed.length}`);
await queue.close();

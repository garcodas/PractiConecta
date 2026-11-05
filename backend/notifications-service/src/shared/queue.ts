/** `redis://host:puerto` en las opciones de conexión de BullMQ. */
export function redisConnection(url: string) {
  const { hostname, port, password } = new URL(url);
  return { host: hostname, port: Number(port || 6379), password: password || undefined };
}

/** Mismas opciones con las que los productores publican sus eventos. */
export const JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 86_400, count: 5_000 },
  removeOnFail: false,
} as const;

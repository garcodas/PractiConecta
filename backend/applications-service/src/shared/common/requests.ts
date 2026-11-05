import type { Role } from '../contracts/index.js';
import { forbidden, notFound, unauthenticated } from './errors.js';

export interface ActorLike {
  userId: string;
  role: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID.test(value);

/** Un id mal formado no puede existir: se responde igual que uno inexistente. */
export function assertUuid(value: string, message?: string) {
  if (!isUuid(value)) throw notFound(message);
}

/** Valida el actor recibido: cada servicio comprueba el rol por su cuenta. */
export function requireRole(actor: ActorLike | undefined, ...roles: Role[]): ActorLike {
  if (!actor?.userId) throw unauthenticated();
  if (!roles.includes(actor.role as Role)) throw forbidden();
  return actor;
}

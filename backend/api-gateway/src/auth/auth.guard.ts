import { type CanActivate, createParamDecorator, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { forbidden, unauthenticated } from '../shared/common/index.js';
import type { commonProto, Role } from '../shared/contracts/index.js';

export const SESSION_COOKIE = 'pc_session';
export const SESSION_HOURS = 8;

const PUBLIC_KEY = 'public-route';
const ROLES_KEY = 'allowed-roles';

export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

type AuthenticatedRequest = Request & { actor?: commonProto.Actor };

/** Actor autenticado de la petición; se envía a los servicios en cada llamada. */
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthenticatedRequest>().actor,
);

function readCookie(request: Request, name: string): string | undefined {
  for (const part of request.headers.cookie?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, SESSION_COOKIE);
    if (!token) throw unauthenticated();
    let payload: { sub: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw unauthenticated('Tu sesión venció. Inicia sesión de nuevo.', 'SESSION_EXPIRED');
    }
    request.actor = { userId: payload.sub, role: payload.role };

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles && !roles.includes(payload.role as Role)) throw forbidden();
    return true;
  }
}

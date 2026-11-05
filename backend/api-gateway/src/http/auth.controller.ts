import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { callGrpc } from '../shared/common/index.js';
import type { commonProto } from '../shared/contracts/index.js';
import { CurrentActor, Public, SESSION_COOKIE, SESSION_HOURS } from '../auth/auth.guard.js';
import { GrpcClients } from '../grpc/grpc-clients.js';
import { text } from './body.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.COOKIE_SECURE === 'true',
} as const;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly grpc: GrpcClients,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const user = await callGrpc(this.grpc.identity.login({ email: text(body, 'email'), password: text(body, 'password') }));
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    response.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_HOURS * 3_600_000 });
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, cookieOptions);
  }

  @Get('me')
  me(@CurrentActor() actor: commonProto.Actor) {
    return callGrpc(this.grpc.identity.getUser({ userId: actor.userId }));
  }
}

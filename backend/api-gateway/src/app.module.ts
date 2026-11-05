import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule } from '@nestjs/microservices';
import { GRPC_CONTRACTS, grpcClientOptions } from './shared/common/index.js';
import { AuthGuard, SESSION_HOURS } from './auth/auth.guard.js';
import { APPLICATIONS, GrpcClients, IDENTITY, NOTIFICATIONS, OFFERS } from './grpc/grpc-clients.js';
import { AdminController } from './http/admin.controller.js';
import { AuthController } from './http/auth.controller.js';
import { CompanyController } from './http/company.controller.js';
import { ErrorFilter } from './http/error.filter.js';
import { HealthController } from './http/health.controller.js';
import { NotificationsController } from './http/notifications.controller.js';
import { StudentController } from './http/student.controller.js';

const url = (name: string, fallback: string) => process.env[name] ?? fallback;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta JWT_SECRET');
  return secret;
}

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({ secret: jwtSecret(), signOptions: { expiresIn: `${SESSION_HOURS}h` } }),
    }),
    ClientsModule.register([
      grpcClientOptions(IDENTITY, GRPC_CONTRACTS.identity, url('IDENTITY_GRPC_URL', 'localhost:50051')),
      grpcClientOptions(OFFERS, GRPC_CONTRACTS.offers, url('OFFERS_GRPC_URL', 'localhost:50052')),
      grpcClientOptions(APPLICATIONS, GRPC_CONTRACTS.applications, url('APPLICATIONS_GRPC_URL', 'localhost:50053')),
      grpcClientOptions(NOTIFICATIONS, GRPC_CONTRACTS.notifications, url('NOTIFICATIONS_GRPC_URL', 'localhost:50054')),
    ]),
  ],
  controllers: [
    AuthController,
    StudentController,
    CompanyController,
    AdminController,
    NotificationsController,
    HealthController,
  ],
  providers: [
    GrpcClients,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ErrorFilter },
  ],
})
export class AppModule {}

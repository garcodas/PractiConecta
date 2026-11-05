import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { callGrpc } from '../shared/common/index.js';
import type { commonProto } from '../shared/contracts/index.js';
import { CurrentActor, Roles } from '../auth/auth.guard.js';
import { GrpcClients } from '../grpc/grpc-clients.js';
import { text } from './body.js';

const approves = (body: unknown) => (body as { approve?: unknown } | undefined)?.approve === true;

@Controller('admin')
@Roles('COORDINATOR')
export class AdminController {
  constructor(private readonly grpc: GrpcClients) {}

  @Get('offers/pending')
  pendingOffers(@CurrentActor() actor: commonProto.Actor) {
    return callGrpc(this.grpc.offers.listPendingOffers({ actor }));
  }

  @Post('offers/:id/decision')
  @HttpCode(200)
  decideOffer(@CurrentActor() actor: commonProto.Actor, @Param('id') offerId: string, @Body() body: unknown) {
    return callGrpc(this.grpc.offers.decideOffer({ actor, offerId, approve: approves(body), reason: text(body, 'reason') }));
  }

  @Get('companies/pending')
  pendingCompanies(@CurrentActor() actor: commonProto.Actor) {
    return callGrpc(this.grpc.identity.listPendingCompanies({ actor }));
  }

  @Post('companies/:id/decision')
  @HttpCode(200)
  decideCompany(@CurrentActor() actor: commonProto.Actor, @Param('id') companyId: string, @Body() body: unknown) {
    return callGrpc(this.grpc.identity.decideCompany({ actor, companyId, approve: approves(body), reason: text(body, 'reason') }));
  }
}

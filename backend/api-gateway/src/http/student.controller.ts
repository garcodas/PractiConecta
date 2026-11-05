import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { callGrpc } from '../shared/common/index.js';
import type { commonProto } from '../shared/contracts/index.js';
import { CurrentActor, Roles } from '../auth/auth.guard.js';
import { GrpcClients } from '../grpc/grpc-clients.js';
import { pageOf } from './body.js';

@Controller()
@Roles('STUDENT')
export class StudentController {
  constructor(private readonly grpc: GrpcClients) {}

  @Get('offers')
  search(
    @CurrentActor() actor: commonProto.Actor,
    @Query('career') careerCode = '',
    @Query('modality') modality = '',
    @Query('schedule') schedule = '',
    @Query('page') page?: string,
  ) {
    return callGrpc(this.grpc.offers.searchOffers({ actor, careerCode, modality, schedule, page: pageOf(page) }));
  }

  @Get('offers/:id')
  async detail(@CurrentActor() actor: commonProto.Actor, @Param('id') offerId: string) {
    const [offer, mine] = await Promise.all([
      callGrpc(this.grpc.offers.getVisibleOffer({ actor, offerId })),
      callGrpc(this.grpc.applications.findMineByOffer({ actor, offerId })),
    ]);
    return { offer, application: mine.found ? mine.application : null };
  }

  @Post('offers/:id/applications')
  @HttpCode(201)
  apply(@CurrentActor() actor: commonProto.Actor, @Param('id') offerId: string) {
    return callGrpc(this.grpc.applications.submit({ actor, offerId }));
  }

  @Get('me/applications')
  myApplications(@CurrentActor() actor: commonProto.Actor) {
    return callGrpc(this.grpc.applications.listMine({ actor }));
  }

  @Get('me/applications/:id')
  myApplication(@CurrentActor() actor: commonProto.Actor, @Param('id') applicationId: string) {
    return callGrpc(this.grpc.applications.getMine({ actor, applicationId }));
  }
}

import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { callGrpc } from '../shared/common/index.js';
import type { commonProto } from '../shared/contracts/index.js';
import { CurrentActor, Roles } from '../auth/auth.guard.js';
import { GrpcClients } from '../grpc/grpc-clients.js';
import { text } from './body.js';

@Controller('company')
@Roles('COMPANY')
export class CompanyController {
  constructor(private readonly grpc: GrpcClients) {}

  @Get('offers')
  async offers(@CurrentActor() actor: commonProto.Actor) {
    const { items } = await callGrpc(this.grpc.offers.listCompanyOffers({ actor }));
    const counts = await callGrpc(
      this.grpc.applications.countByOffers({ actor, offerIds: items.map((offer) => offer.id) }),
    );
    const byOffer = new Map(counts.items.map((item) => [item.offerId, item.count]));
    return { items: items.map((offer) => ({ ...offer, applicationCount: byOffer.get(offer.id) ?? 0 })) };
  }

  @Post('offers')
  @HttpCode(201)
  create(@CurrentActor() actor: commonProto.Actor, @Body() body: unknown) {
    return callGrpc(
      this.grpc.offers.createOffer({
        actor,
        title: text(body, 'title'),
        description: text(body, 'description'),
        careerCode: text(body, 'careerCode'),
        modality: text(body, 'modality'),
        schedule: text(body, 'schedule'),
        deadline: text(body, 'deadline'),
      }),
    );
  }

  @Post('offers/:id/close')
  @HttpCode(200)
  close(@CurrentActor() actor: commonProto.Actor, @Param('id') offerId: string) {
    return callGrpc(this.grpc.offers.closeOffer({ actor, offerId }));
  }

  /**
   * La propiedad de la oferta se comprueba primero: solo entonces se piden los
   * perfiles, y únicamente los de quienes se postularon (RNF-03).
   */
  @Get('offers/:id/applications')
  async applicants(@CurrentActor() actor: commonProto.Actor, @Param('id') offerId: string) {
    const offer = await callGrpc(this.grpc.offers.getCompanyOffer({ actor, offerId }));
    const { items } = await callGrpc(this.grpc.applications.listByOffer({ actor, offerId }));
    const studentIds = items.map((application) => application.studentId);
    const students = await callGrpc(this.grpc.identity.getStudentSummaries({ actor, studentIds }));
    const byId = new Map(students.items.map((student) => [student.id, student]));
    return {
      offer,
      items: items.map((application) => ({ ...application, student: byId.get(application.studentId) ?? null })),
    };
  }

  @Patch('applications/:id/status')
  changeStatus(@CurrentActor() actor: commonProto.Actor, @Param('id') applicationId: string, @Body() body: unknown) {
    return callGrpc(this.grpc.applications.changeStatus({ actor, applicationId, toStatus: text(body, 'status') }));
  }
}

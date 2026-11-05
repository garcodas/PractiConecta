import { Controller } from '@nestjs/common';
import { identityProto as proto, type commonProto } from '../shared/contracts/index.js';
import { IdentityService } from '../application/identity.service.js';

@Controller()
@proto.IdentityServiceControllerMethods()
export class IdentityController implements proto.IdentityServiceController {
  constructor(private readonly identity: IdentityService) {}

  login(request: proto.LoginRequest) {
    return this.identity.login(request.email, request.password);
  }

  getUser(request: proto.UserIdRequest) {
    return this.identity.getUser(request.userId);
  }

  listPendingCompanies(request: commonProto.ActorRequest) {
    return this.identity.listPendingCompanies(request.actor);
  }

  decideCompany(request: proto.DecideCompanyRequest) {
    return this.identity.decideCompany(request.actor, request.companyId, request.approve, request.reason);
  }

  getStudentSummaries(request: proto.StudentSummariesRequest) {
    return this.identity.getStudentSummaries(request.actor, request.studentIds);
  }
}

@Controller()
@proto.IdentityInternalServiceControllerMethods()
export class IdentityInternalController implements proto.IdentityInternalServiceController {
  constructor(private readonly identity: IdentityService) {}

  getCompany(request: proto.CompanyIdRequest) {
    return this.identity.getCompany(request.companyId);
  }

  listUserIdsByRole(request: proto.RoleRequest) {
    return this.identity.listUserIdsByRole(request.role);
  }
}

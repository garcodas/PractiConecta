/** Puerto hacia identity-service (PID): el caso de uso no conoce gRPC. */
export const COMPANY_DIRECTORY = Symbol('COMPANY_DIRECTORY');

export interface CompanyDirectory {
  getCompany(companyId: string): Promise<{ id: string; name: string; status: string }>;
}

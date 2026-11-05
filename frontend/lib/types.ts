export type Role = "STUDENT" | "COMPANY" | "COORDINATOR";

export interface User {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  companyStatus: string;
}

export interface Offer {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  careerCode: string;
  modality: string;
  schedule: string;
  deadline: string;
  status: string;
  rejectionReason: string;
  createdAt: string;
  applicationCount?: number;
}

export interface OfferPage {
  items: Offer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Application {
  id: string;
  offerId: string;
  studentId: string;
  offerTitle: string;
  companyName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  allowedTransitions: string[];
}

export interface StudentSummary {
  id: string;
  fullName: string;
  careerCode: string;
  semester: number;
  skills: string[];
  hasCv: boolean;
}

export interface Applicant extends Application {
  student: StudentSummary | null;
}

export interface StatusChange {
  fromStatus: string;
  toStatus: string;
  changedAt: string;
}

export interface Company {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: string;
  createdAt: string;
}

export const ROLES = ['STUDENT', 'COMPANY', 'COORDINATOR'] as const;
export type Role = (typeof ROLES)[number];

export const CAREERS = {
  SISTEMAS: 'Ingeniería en Sistemas',
  INDUSTRIAL: 'Ingeniería Industrial',
  ADMINISTRACION: 'Administración de Empresas',
  DISENO: 'Diseño Gráfico',
  MERCADOTECNIA: 'Mercadotecnia',
} as const;
export type CareerCode = keyof typeof CAREERS;

export const COMPANY_STATUSES = ['PENDIENTE', 'APROBADA', 'RECHAZADA'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

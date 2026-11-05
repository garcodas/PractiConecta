export const ROLES = ['STUDENT', 'COMPANY', 'COORDINATOR'] as const;
export type Role = (typeof ROLES)[number];

export const APPLICATION_STATUSES = {
  ENVIADA: 'Enviada',
  EN_REVISION: 'En revisión',
  ENTREVISTA: 'Entrevista',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUSES;

export const PAGE_SIZE = 20;

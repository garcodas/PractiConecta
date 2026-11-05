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

export const MODALITIES = {
  PRESENCIAL: 'Presencial',
  REMOTA: 'Remota',
  HIBRIDA: 'Híbrida',
} as const;
export type Modality = keyof typeof MODALITIES;

export const SCHEDULES = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  MEDIO_TIEMPO: 'Medio tiempo',
} as const;
export type Schedule = keyof typeof SCHEDULES;

export const OFFER_STATUSES = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CERRADA'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const PAGE_SIZE = 20;

export const ROLES = ['STUDENT', 'COMPANY', 'COORDINATOR'] as const;
export type Role = (typeof ROLES)[number];

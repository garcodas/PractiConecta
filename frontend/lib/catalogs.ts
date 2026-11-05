export const CAREERS: Record<string, string> = {
  SISTEMAS: "Ingeniería en Sistemas",
  INDUSTRIAL: "Ingeniería Industrial",
  ADMINISTRACION: "Administración de Empresas",
  DISENO: "Diseño Gráfico",
  MERCADOTECNIA: "Mercadotecnia",
};

export const MODALITIES: Record<string, string> = {
  PRESENCIAL: "Presencial",
  REMOTA: "Remota",
  HIBRIDA: "Híbrida",
};

export const SCHEDULES: Record<string, string> = {
  TIEMPO_COMPLETO: "Tiempo completo",
  MEDIO_TIEMPO: "Medio tiempo",
};

export const APPLICATION_STEPS = ["ENVIADA", "EN_REVISION", "ENTREVISTA", "ACEPTADA"] as const;

export const APPLICATION_STATUSES: Record<string, string> = {
  ENVIADA: "Enviada",
  EN_REVISION: "En revisión",
  ENTREVISTA: "Entrevista",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
};

export const OFFER_STATUSES: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CERRADA: "Cerrada",
};

/** Texto de cada botón de cambio de estado. */
export const TRANSITION_LABELS: Record<string, string> = {
  EN_REVISION: "Pasar a En revisión",
  ENTREVISTA: "Pasar a Entrevista",
  ACEPTADA: "Aceptar",
  RECHAZADA: "Rechazar",
};

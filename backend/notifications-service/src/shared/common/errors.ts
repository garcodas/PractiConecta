export type ErrorKind =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAVAILABLE'
  | 'INTERNAL';

export type FieldErrors = Record<string, string>;

/** Error de negocio: viaja igual por gRPC y termina en la respuesta HTTP. */
export class DomainError extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const notFound = (message = 'El recurso solicitado no existe.', code = 'NOT_FOUND') =>
  new DomainError('NOT_FOUND', code, message);

export const conflict = (code: string, message: string) => new DomainError('CONFLICT', code, message);

export const forbidden = (message = 'No tienes permiso para realizar esta acción.', code = 'FORBIDDEN') =>
  new DomainError('FORBIDDEN', code, message);

export const unauthenticated = (message = 'Debes iniciar sesión para continuar.', code = 'UNAUTHENTICATED') =>
  new DomainError('UNAUTHENTICATED', code, message);

export const validationError = (fields: FieldErrors, message = 'Revisa los campos marcados.') =>
  new DomainError('VALIDATION', 'VALIDATION', message, fields);

export const unavailable = () =>
  new DomainError(
    'UNAVAILABLE',
    'SERVICE_UNAVAILABLE',
    'El servicio no está disponible en este momento. Puedes reintentar sin riesgo de duplicar la operación.',
  );

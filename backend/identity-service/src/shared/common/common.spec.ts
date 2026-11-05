import { describe, expect, it } from 'vitest';
import { addDays, isValidDate, todayIn } from './dates.js';
import { conflict, DomainError, forbidden, notFound, unauthenticated, unavailable, validationError } from './errors.js';
import { decodeGrpcError, encodeGrpcError, httpStatusFor } from './grpc.js';
import { requireRole } from './requests.js';

describe('mapeo de errores', () => {
  it.each([
    [validationError({ a: 'x' }), 422, 3],
    [unauthenticated(), 401, 16],
    [forbidden(), 403, 7],
    [notFound(), 404, 5],
    [conflict('C', 'm'), 409, 9],
    [unavailable(), 503, 14],
  ])('%s', (error, http, grpc) => {
    expect(httpStatusFor(error.kind)).toBe(http);
    expect(encodeGrpcError(error).code).toBe(grpc);
    const decoded = decodeGrpcError({ details: encodeGrpcError(error).message });
    expect(decoded).toBeInstanceOf(DomainError);
    expect(decoded).toMatchObject({ kind: error.kind, code: error.code, message: error.message });
  });

  it('un error de transporte se trata como no disponible', () => {
    expect(decodeGrpcError({ code: 14, details: 'No connection established' }).kind).toBe('UNAVAILABLE');
  });
});

describe('fechas', () => {
  it('usa la zona horaria de la universidad, no UTC', () => {
    const utcMidnightPassed = new Date('2026-11-04T03:00:00Z');
    expect(todayIn('America/Guatemala', utcMidnightPassed)).toBe('2026-11-03');
    expect(todayIn('UTC', utcMidnightPassed)).toBe('2026-11-04');
  });

  it('valida fechas reales', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('mañana')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('requireRole', () => {
  it('distingue sin sesión de rol incorrecto', () => {
    expect(() => requireRole(undefined, 'STUDENT')).toThrowError(expect.objectContaining({ kind: 'UNAUTHENTICATED' }));
    expect(() => requireRole({ userId: 'u', role: 'COMPANY' }, 'STUDENT')).toThrowError(
      expect.objectContaining({ kind: 'FORBIDDEN' }),
    );
    expect(requireRole({ userId: 'u', role: 'STUDENT' }, 'STUDENT').userId).toBe('u');
  });
});

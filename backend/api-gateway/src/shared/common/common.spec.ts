import { describe, expect, it } from 'vitest';
import { conflict, DomainError, forbidden, notFound, unauthenticated, unavailable, validationError } from './errors.js';
import { decodeGrpcError, encodeGrpcError, httpStatusFor } from './grpc.js';

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

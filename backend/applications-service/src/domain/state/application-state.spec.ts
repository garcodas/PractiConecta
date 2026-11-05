import { describe, expect, it } from 'vitest';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../../shared/contracts/index.js';
import { Application } from '../application.js';
import { stateOf } from './application-state.js';

const ALL = Object.keys(APPLICATION_STATUSES) as ApplicationStatus[];

const VALID: Record<ApplicationStatus, ApplicationStatus[]> = {
  ENVIADA: ['EN_REVISION', 'RECHAZADA'],
  EN_REVISION: ['ENTREVISTA', 'RECHAZADA'],
  ENTREVISTA: ['ACEPTADA', 'RECHAZADA'],
  ACEPTADA: [],
  RECHAZADA: [],
};

const pairs = ALL.flatMap((from) => ALL.map((to) => [from, to] as const));

describe('ciclo de estados de la postulación', () => {
  it.each(pairs)('%s → %s', (from, to) => {
    if (VALID[from].includes(to)) {
      expect(stateOf(from).transitionTo(to).status).toBe(to);
    } else {
      expect(() => stateOf(from).transitionTo(to)).toThrowError(expect.objectContaining({ kind: 'CONFLICT' }));
    }
  });

  it('Aceptada y Rechazada son finales', () => {
    expect(stateOf('ACEPTADA').isFinal).toBe(true);
    expect(stateOf('RECHAZADA').isFinal).toBe(true);
    expect(stateOf('ENVIADA').isFinal).toBe(false);
  });

  it('expone las transiciones permitidas', () => {
    expect(stateOf('ENVIADA').allowedTransitions).toEqual(['EN_REVISION', 'RECHAZADA']);
  });

  it('el mensaje explica el estado final', () => {
    expect(() => stateOf('ACEPTADA').transitionTo('RECHAZADA')).toThrowError(
      expect.objectContaining({ code: 'APPLICATION_FINAL' }),
    );
  });
});

describe('Application', () => {
  const data = { offerId: 'o', studentId: 's', companyId: 'c', offerTitle: 't', companyName: 'n' };

  it('nace Enviada con su primer registro de historial', () => {
    const { application, firstChange } = Application.submit(data);
    expect(application.status).toBe('ENVIADA');
    expect(firstChange).toMatchObject({ fromStatus: null, toStatus: 'ENVIADA', changedBy: 's' });
  });

  it('un cambio inválido no altera la postulación', () => {
    const { application } = Application.submit(data);
    expect(() => application.changeStatus('ACEPTADA', 'c')).toThrow();
    expect(application.status).toBe('ENVIADA');
  });

  it('un cambio válido devuelve el registro para el historial', () => {
    const { application } = Application.submit(data);
    expect(application.changeStatus('EN_REVISION', 'c')).toMatchObject({ fromStatus: 'ENVIADA', toStatus: 'EN_REVISION', changedBy: 'c' });
  });
});

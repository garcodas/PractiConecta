import { describe, expect, it } from 'vitest';
import { validateFilters, validateOffer } from './offer-validation.js';

const valid = {
  title: ' Practicante ',
  description: 'Apoyar',
  careerCode: 'SISTEMAS',
  modality: 'REMOTA',
  schedule: 'MEDIO_TIEMPO',
  deadline: '2026-11-10',
};
const today = '2026-11-03';

const fieldsOf = (input: Partial<typeof valid>) => {
  try {
    validateOffer({ ...valid, ...input }, today);
    return {};
  } catch (error) {
    return (error as { fields: Record<string, string> }).fields;
  }
};

describe('validación de ofertas', () => {
  it('acepta datos válidos y recorta espacios', () => {
    expect(validateOffer(valid, today).title).toBe('Practicante');
  });

  it('acepta hoy como fecha límite', () => {
    expect(validateOffer({ ...valid, deadline: today }, today).deadline).toBe(today);
  });

  it.each([
    ['title', { title: '  ' }],
    ['title', { title: 'x'.repeat(121) }],
    ['description', { description: '' }],
    ['careerCode', { careerCode: 'MAGIA' }],
    ['modality', { modality: 'LUNAR' }],
    ['schedule', { schedule: 'NOCTURNA' }],
    ['deadline', { deadline: 'pronto' }],
    ['deadline', { deadline: '2026-02-30' }],
    ['deadline', { deadline: '2026-11-02' }],
  ])('señala %s', (field, input) => {
    expect(Object.keys(fieldsOf(input))).toEqual([field]);
  });

  it('informa todos los campos a la vez', () => {
    expect(Object.keys(fieldsOf({ title: '', modality: '', deadline: '' })).sort()).toEqual(['deadline', 'modality', 'title']);
  });
});

describe('validación de filtros', () => {
  it('los filtros vacíos no restringen', () => {
    expect(() => validateFilters({ careerCode: '', modality: '', schedule: '' })).not.toThrow();
  });

  it('rechaza un valor no permitido', () => {
    expect(() => validateFilters({ careerCode: '', modality: 'LUNAR', schedule: '' })).toThrowError(
      expect.objectContaining({ kind: 'VALIDATION', fields: { modality: 'La modalidad no es válida.' } }),
    );
  });
});

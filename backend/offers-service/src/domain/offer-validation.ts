import { type FieldErrors, isValidDate, validationError } from '../shared/common/index.js';
import { CAREERS, MODALITIES, SCHEDULES, type CareerCode, type Modality, type Schedule } from '../shared/contracts/index.js';

export interface OfferInput {
  title: string;
  description: string;
  careerCode: string;
  modality: string;
  schedule: string;
  deadline: string;
}

export interface ValidOffer {
  title: string;
  description: string;
  careerCode: CareerCode;
  modality: Modality;
  schedule: Schedule;
  deadline: string;
}

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 4000;

export const isCareer = (value: string): value is CareerCode => value in CAREERS;
export const isModality = (value: string): value is Modality => value in MODALITIES;
export const isSchedule = (value: string): value is Schedule => value in SCHEDULES;

export function validateOffer(input: OfferInput, today: string): ValidOffer {
  const fields: FieldErrors = {};
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) fields.title = 'Escribe el puesto.';
  else if (title.length > MAX_TITLE) fields.title = `Usa ${MAX_TITLE} caracteres o menos.`;
  if (!description) fields.description = 'Describe la práctica.';
  else if (description.length > MAX_DESCRIPTION) fields.description = `Usa ${MAX_DESCRIPTION} caracteres o menos.`;
  if (!isCareer(input.careerCode)) fields.careerCode = 'Selecciona una carrera de la lista.';
  if (!isModality(input.modality)) fields.modality = 'Selecciona una modalidad de la lista.';
  if (!isSchedule(input.schedule)) fields.schedule = 'Selecciona una jornada de la lista.';
  if (!isValidDate(input.deadline)) fields.deadline = 'Indica una fecha límite válida.';
  else if (input.deadline < today) fields.deadline = 'La fecha límite no puede ser anterior a hoy.';

  if (Object.keys(fields).length > 0) throw validationError(fields);
  return { ...input, title, description } as ValidOffer;
}

export interface SearchFilters {
  careerCode: string;
  modality: string;
  schedule: string;
}

export function validateFilters({ careerCode, modality, schedule }: SearchFilters) {
  const fields: FieldErrors = {};
  if (careerCode && !isCareer(careerCode)) fields.careerCode = 'La carrera no es válida.';
  if (modality && !isModality(modality)) fields.modality = 'La modalidad no es válida.';
  if (schedule && !isSchedule(schedule)) fields.schedule = 'La jornada no es válida.';
  if (Object.keys(fields).length > 0) throw validationError(fields, 'Algún filtro no es válido.');
}

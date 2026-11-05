import { describe, expect, it, vi } from 'vitest';
import { EVENT_ROUTES, type EventEnvelope, type EventDataMap, type EventType } from '../shared/contracts/index.js';
import { TEMPLATES } from './templates.js';

const event = <T extends EventType>(type: T, data: EventDataMap[T]): EventEnvelope<T> => ({
  eventId: 'e', type, version: 1, occurredAt: '2026-11-03T00:00:00Z', data,
});
const find = (type: EventType) => TEMPLATES.find((template) => template.type === type)!;
const directory = { listUserIdsByRole: vi.fn(async () => ['c1', 'c2']) };

const CASES: [EventType, EventEnvelope<any>, string[], RegExp][] = [
  ['offer.submitted', event('offer.submitted', { offerId: 'o', title: 'Dev', companyId: 'c', companyName: 'ACME' }), ['c1', 'c2'], /ACME/],
  ['offer.approved', event('offer.approved', { offerId: 'o', title: 'Dev', companyId: 'c' }), ['c'], /Dev/],
  ['offer.rejected', event('offer.rejected', { offerId: 'o', title: 'Dev', companyId: 'c', reason: 'Faltan datos' }), ['c'], /Faltan datos/],
  ['company.approved', event('company.approved', { companyId: 'c', companyName: 'ACME' }), ['c'], /publicar/],
  ['company.rejected', event('company.rejected', { companyId: 'c', companyName: 'ACME', reason: 'Sin NIT' }), ['c'], /Sin NIT/],
  ['application.submitted', event('application.submitted', { applicationId: 'a', offerId: 'o', offerTitle: 'Dev', companyId: 'c', studentId: 's' }), ['c'], /Dev/],
  ['application.status_changed', event('application.status_changed', { applicationId: 'a', offerId: 'o', offerTitle: 'Dev', companyName: 'ACME', studentId: 's', fromStatus: 'ENVIADA', toStatus: 'EN_REVISION' }), ['s'], /Dev/],
];

describe('plantillas de notificación', () => {
  it('hay una plantilla por cada evento enrutado', () => {
    expect(TEMPLATES.map((template) => template.type).sort()).toEqual(Object.keys(EVENT_ROUTES).sort());
  });

  it.each(CASES)('%s', async (type, envelope, recipients, body) => {
    const template = find(type);
    expect(await template.recipients(envelope, directory)).toEqual(recipients);
    const rendered = template.render(envelope);
    expect(rendered.title).toBeTruthy();
    expect(rendered.link).toMatch(/^\//);
    expect(rendered.body).toMatch(body);
  });

  it('el cambio de estado nombra el estado en español', () => {
    const [, envelope] = CASES[6];
    expect(find('application.status_changed').render(envelope).title).toContain('En revisión');
  });
});

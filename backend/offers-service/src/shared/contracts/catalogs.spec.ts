import { describe, expect, it } from 'vitest';
import { CAREERS, EVENT_ROUTES, MODALITIES, NOTIFICATIONS_QUEUE, SCHEDULES } from './index.js';

describe('catálogos y eventos', () => {
  it('exponen los valores del caso', () => {
    expect(Object.keys(MODALITIES)).toEqual(['PRESENCIAL', 'REMOTA', 'HIBRIDA']);
    expect(Object.keys(SCHEDULES)).toEqual(['TIEMPO_COMPLETO', 'MEDIO_TIEMPO']);
    expect(Object.keys(CAREERS).length).toBeGreaterThanOrEqual(3);
  });

  it('todo evento llega al sistema de notificaciones', () => {
    for (const queues of Object.values(EVENT_ROUTES)) expect(queues).toContain(NOTIFICATIONS_QUEUE);
  });
});

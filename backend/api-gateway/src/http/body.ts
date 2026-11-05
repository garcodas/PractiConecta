/** Lee un campo de texto del cuerpo; las reglas de negocio se validan en el servicio. */
export function text(body: unknown, field: string): string {
  const value = (body as Record<string, unknown> | undefined)?.[field];
  return typeof value === 'string' ? value : '';
}

export const pageOf = (value: string | undefined) => Number.parseInt(value ?? '1', 10) || 1;

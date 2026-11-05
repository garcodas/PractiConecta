const TIME_ZONE = "America/Guatemala";

/** dd/mm/aaaa a partir de una fecha AAAA-MM-DD, sin desfase de zona horaria. */
export function formatDay(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-GT", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const time = new Intl.DateTimeFormat("es-GT", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  return `${formatDate(iso)}, ${time}`;
}

export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }

  /** El servicio no respondió: reintentar es seguro. */
  get retryable() {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 500;
  }
}

const OFFLINE = "No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.";

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "NETWORK", OFFLINE);
  }

  const raw = await response.text();
  let body: { code?: string; message?: string; fields?: Record<string, string> } | undefined;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
    throw new ApiError(response.status, body?.code ?? "UNKNOWN", body?.message ?? OFFLINE, body?.fields);
  }
  return body as T;
}

export const asApiError = (error: unknown) =>
  error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", OFFLINE);

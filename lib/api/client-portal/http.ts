import { ApiError } from "../errors";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Wrapper de fetch del PORTAL DEL CLIENTE. Espejo de `apiFetch` de staff pero con
 * su propio ciclo de sesión: el refresh pega a `/portal/auth/refresh` (cookies
 * client_*) y un 401 definitivo rebota a `/portal/entrar` (no a `/login`). NO se
 * reusa el `apiFetch` de staff para no cruzar endpoints ni redirects.
 */

type ClientFetchOpts = {
  auth?: boolean;
  retried?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshClientAccess(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/portal/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function ensureClientRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshClientAccess().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

const ENTRAR_PATH = "/portal/entrar";

function redirectToEntrar(): void {
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith(ENTRAR_PATH)
  ) {
    window.location.href = ENTRAR_PATH;
  }
}

export async function clientFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: ClientFetchOpts = {},
): Promise<T> {
  const useAuth = opts.auth !== false;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && useAuth && !opts.retried) {
    const ok = await ensureClientRefresh();
    if (!ok) {
      redirectToEntrar();
      throw new ApiError(401, "session expired");
    }
    return clientFetch<T>(path, init, { ...opts, retried: true });
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

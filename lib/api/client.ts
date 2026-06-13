import { ApiError } from "./errors";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

if (!BASE && typeof window !== "undefined") {
  // Surface the misconfiguration early in the browser console.
  console.warn(
    "NEXT_PUBLIC_API_URL no está definido — el frontend no podrá hablar con el API.",
  );
}

type FetchOpts = {
  auth?: boolean;
  retried?: boolean;
};

// La sesión vive en cookies httpOnly: el navegador las manda solo con
// `credentials: "include"`. El front ya no lee/escribe tokens (no son legibles
// por JS); el access viaja en la cookie y el refresh se rota server-side.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  try {
    // Bodyless: el refresh token va en su cookie httpOnly; el backend rota y
    // re-setea ambas cookies en la respuesta.
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function ensureRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccess().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: FetchOpts = {},
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
    const ok = await ensureRefresh();
    if (!ok) {
      redirectToLogin();
      throw new ApiError(401, "session expired");
    }
    return apiFetch<T>(path, init, { ...opts, retried: true });
  }

  if (!res.ok) {
    const err = await ApiError.fromResponse(res);
    // Backstop del cambio forzado: si el guard bloquea, manda a fijar la
    // contraseña (el layout ya redirige por /me; esto cubre el resto).
    if (
      err.status === 403 &&
      err.body?.error === "PASSWORD_CHANGE_REQUIRED" &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/change-password"
    ) {
      window.location.href = "/change-password";
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Como `apiFetch` pero devuelve el cuerpo crudo como Blob (descargas de
 * archivos: Excel/PDF de reportes). Reusa el refresh de token en 401.
 */
export async function apiFetchBlob(
  path: string,
  init: RequestInit = {},
  opts: FetchOpts = {},
): Promise<Blob> {
  const useAuth = opts.auth !== false;
  const headers = new Headers(init.headers);

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && useAuth && !opts.retried) {
    const ok = await ensureRefresh();
    if (!ok) {
      redirectToLogin();
      throw new ApiError(401, "session expired");
    }
    return apiFetchBlob(path, init, { ...opts, retried: true });
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  return res.blob();
}

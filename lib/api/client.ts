import { tokenStorage, type StoredTokens } from "@/lib/auth/tokens";
import { ApiError } from "./errors";
import type { ApiLoginResponse } from "./types";

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

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const stored = tokenStorage.read();
  if (!stored) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiLoginResponse;
    const next: StoredTokens = {
      accessToken: json.accessToken,
      refreshToken: json.refreshToken,
      accessExpiresAt: json.accessExpiresAt,
      refreshExpiresAt: json.refreshExpiresAt,
    };
    tokenStorage.write(next);
    return json.accessToken;
  } catch {
    return null;
  }
}

function ensureRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccess().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: FetchOpts = {},
): Promise<T> {
  const useAuth = opts.auth !== false;
  const stored = tokenStorage.read();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (useAuth && stored) {
    headers.set("Authorization", `Bearer ${stored.accessToken}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && useAuth && !opts.retried) {
    const fresh = await ensureRefresh();
    if (!fresh) {
      tokenStorage.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "session expired");
    }
    return apiFetch<T>(path, init, { ...opts, retried: true });
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
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
  const stored = tokenStorage.read();
  const headers = new Headers(init.headers);
  if (useAuth && stored) {
    headers.set("Authorization", `Bearer ${stored.accessToken}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && useAuth && !opts.retried) {
    const fresh = await ensureRefresh();
    if (!fresh) {
      tokenStorage.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "session expired");
    }
    return apiFetchBlob(path, init, { ...opts, retried: true });
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  return res.blob();
}

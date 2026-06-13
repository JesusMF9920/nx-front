"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "@/lib/api/auth";
import { meApi } from "@/lib/api/me";
import { settingsApi } from "@/lib/api/settings";
import type { ApiMe, ApiRole, ApiUser } from "@/lib/api/types";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export type AuthState = {
  status: AuthStatus;
  user: ApiUser | null;
  roles: ApiRole[];
  permissions: string[];
  /** Feature flags del backend (key → enabled). Vacío = todo oculto. */
  features: Record<string, boolean>;
  mustChangePassword: boolean;
};

export type AuthContextValue = AuthState & {
  login: (
    email: string,
    password: string,
  ) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const initialState: AuthState = {
  status: "loading",
  user: null,
  roles: [],
  permissions: [],
  features: {},
  mustChangePassword: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stateFromMe(me: ApiMe, features: Record<string, boolean>): AuthState {
  return {
    status: "authenticated",
    user: me.user,
    roles: me.roles,
    permissions: me.permissions,
    features,
    mustChangePassword: me.user.mustChangePassword,
  };
}

/**
 * Carga los feature flags junto con /me. FAIL-CLOSED: si el fetch falla, {} —
 * la UI esconde lo gateado en vez de mostrar funciones que el backend va a
 * rechazar (su guard revalida siempre).
 */
async function fetchFeatures(): Promise<Record<string, boolean>> {
  try {
    const res = await settingsApi.listFeatures();
    return Object.fromEntries(res.items.map((f) => [f.key, f.enabled]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    // La sesión vive en cookies httpOnly que el front no puede leer; en el boot
    // probamos /me directo. Si la cookie de access expiró pero la de refresh
    // sigue viva, apiFetch la rota de forma transparente; un 401 definitivo
    // (sin sesión) cae al catch → unauthenticated.
    try {
      const [me, features] = await Promise.all([meApi.get(), fetchFeatures()]);
      setState(stateFromMe(me, features));
    } catch {
      setState({ ...initialState, status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    // Limpieza única: borra el token pre-migración que pudiera quedar en
    // localStorage. La sesión ahora vive solo en cookies httpOnly; dejar el
    // token viejo ahí sería un secreto colgando sin uso.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("nxpos.auth.v1");
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      // El backend setea las cookies httpOnly en la respuesta del login.
      const res = await authApi.login(email, password);
      await refresh();
      return { mustChangePassword: res.user.mustChangePassword };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      // Bodyless: el backend lee el refresh de la cookie, lo revoca y limpia
      // ambas cookies. Best-effort — limpiamos el estado local pase lo que pase.
      await authApi.logout();
    } catch {
      // best-effort
    }
    setState({ ...initialState, status: "unauthenticated" });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, refresh }),
    [state, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}

/**
 * ¿El usuario tiene este permiso? Gating de UI solamente — el backend siempre
 * revalida con sus guards; esto es UX (ocultar/deshabilitar lo que no podría
 * usar). super-admin trae todos los permisos en el arreglo.
 */
export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}

/**
 * Helper puro de useFeature (testeable sin React): un flag sólo está activo
 * con `true` explícito — ausente o cargando cuenta como apagado (fail-closed).
 */
export function hasFeature(
  features: Record<string, boolean>,
  key: string,
): boolean {
  return features[key] === true;
}

/**
 * ¿El feature flag está encendido? Espejo de usePermission: gating de UI
 * solamente — el backend revalida con su FeatureFlagsGuard.
 */
export function useFeature(key: string): boolean {
  const { features } = useAuth();
  return hasFeature(features, key);
}

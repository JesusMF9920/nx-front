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
import type { ApiMe, ApiRole, ApiUser } from "@/lib/api/types";
import { tokenStorage } from "./tokens";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export type AuthState = {
  status: AuthStatus;
  user: ApiUser | null;
  roles: ApiRole[];
  permissions: string[];
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
  mustChangePassword: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stateFromMe(me: ApiMe): AuthState {
  return {
    status: "authenticated",
    user: me.user,
    roles: me.roles,
    permissions: me.permissions,
    mustChangePassword: me.user.mustChangePassword,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    const stored = tokenStorage.read();
    if (!stored) {
      setState({ ...initialState, status: "unauthenticated" });
      return;
    }
    try {
      const me = await meApi.get();
      setState(stateFromMe(me));
    } catch {
      tokenStorage.clear();
      setState({ ...initialState, status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      tokenStorage.write({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        accessExpiresAt: res.accessExpiresAt,
        refreshExpiresAt: res.refreshExpiresAt,
      });
      await refresh();
      return { mustChangePassword: res.user.mustChangePassword };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    const stored = tokenStorage.read();
    if (stored) {
      try {
        await authApi.logout(stored.refreshToken);
      } catch {
        // best-effort — we always clear local state below
      }
    }
    tokenStorage.clear();
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

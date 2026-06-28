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

import { clientAuthApi } from "@/lib/api/client-portal/auth";
import type { ClientSession } from "@/lib/api/client-portal/types";

export type ClientAuthStatus = "loading" | "unauthenticated" | "authenticated";

type ClientAuthState = {
  status: ClientAuthStatus;
  client: ClientSession | null;
};

export type ClientAuthContextValue = ClientAuthState & {
  /** Pide el magic-link (responde ok aunque el correo no exista). */
  requestLink: (email: string) => Promise<void>;
  /** Canjea el token del correo e inicia sesión. */
  redeem: (token: string) => Promise<ClientSession>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const initialState: ClientAuthState = {
  status: "loading",
  client: null,
};

const ClientAuthContext = createContext<ClientAuthContextValue | null>(null);

/**
 * Provider de la sesión del CLIENTE. Independiente del AuthProvider de staff:
 * sondea `/portal/auth/me` (cookies client_*) y NO comparte estado con el
 * back-office. Vive sólo dentro del árbol `(client)`.
 */
export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientAuthState>(initialState);
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const client = await clientAuthApi.me();
      setState({ status: "authenticated", client });
    } catch {
      setState({ status: "unauthenticated", client: null });
    }
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void refresh();
  }, [refresh]);

  const requestLink = useCallback(async (email: string) => {
    await clientAuthApi.requestLink(email);
  }, []);

  const redeem = useCallback(async (token: string) => {
    const client = await clientAuthApi.redeem(token);
    setState({ status: "authenticated", client });
    return client;
  }, []);

  const logout = useCallback(async () => {
    try {
      await clientAuthApi.logout();
    } catch {
      // best-effort
    }
    setState({ status: "unauthenticated", client: null });
  }, []);

  const value = useMemo<ClientAuthContextValue>(
    () => ({ ...state, requestLink, redeem, logout, refresh }),
    [state, requestLink, redeem, logout, refresh],
  );

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth(): ClientAuthContextValue {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) {
    throw new Error(
      "useClientAuth debe usarse dentro de <ClientAuthProvider>",
    );
  }
  return ctx;
}

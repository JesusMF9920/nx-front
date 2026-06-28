import { clientFetch } from "./http";
import type { ClientSession } from "./types";

export const clientAuthApi = {
  /** Pide el magic-link. El backend responde 200 siempre (anti-enumeración). */
  requestLink(email: string): Promise<{ ok: true }> {
    return clientFetch<{ ok: true }>(
      "/portal/auth/request-link",
      { method: "POST", body: JSON.stringify({ email }) },
      { auth: false },
    );
  },

  /** Canjea el token del correo por una sesión (setea cookies client_*). */
  redeem(token: string): Promise<ClientSession> {
    return clientFetch<ClientSession>(
      "/portal/auth/redeem",
      { method: "POST", body: JSON.stringify({ token }) },
      { auth: false },
    );
  },

  me(): Promise<ClientSession> {
    return clientFetch<ClientSession>("/portal/auth/me");
  },

  logout(): Promise<void> {
    return clientFetch<void>(
      "/portal/auth/logout",
      { method: "POST" },
      { auth: false },
    );
  },
};

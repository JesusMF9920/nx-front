import { apiFetch } from "./client";
import type {
  ApiCashCloseResult,
  ApiCashMovementType,
  ApiCashSession,
  ApiCashSessionDetail,
} from "./types";

export const cashApi = {
  open(openingFloat: number): Promise<{ sessionId: string; folio: string }> {
    return apiFetch("/cash-sessions", {
      method: "POST",
      body: JSON.stringify({ openingFloat }),
    });
  },

  /**
   * La sesión abierta o null (el VM nunca trae esperado en abiertas). El
   * backend la envuelve en { session } para que el body siempre sea JSON.
   */
  async active(): Promise<ApiCashSession | null> {
    const res = await apiFetch<{ session: ApiCashSession | null }>(
      "/cash-sessions/active",
    );
    return res.session;
  },

  addMovement(input: {
    type: ApiCashMovementType;
    amount: number;
    reason: string;
  }): Promise<{ movementId: string; sessionId: string }> {
    return apiFetch("/cash-sessions/active/movements", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Arqueo ciego: manda lo contado; el backend revela esperado y diferencia. */
  close(
    sessionId: string,
    input: { countedCash: number; notes?: string },
  ): Promise<ApiCashCloseResult> {
    return apiFetch(`/cash-sessions/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  list(params: { skip?: number; take?: number } = {}): Promise<{
    items: ApiCashSession[];
    total: number;
  }> {
    const qs = new URLSearchParams();
    if (params.skip !== undefined) qs.set("skip", String(params.skip));
    if (params.take !== undefined) qs.set("take", String(params.take));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch(`/cash-sessions${suffix}`);
  },

  detail(sessionId: string): Promise<ApiCashSessionDetail> {
    return apiFetch(`/cash-sessions/${sessionId}`);
  },
};

import { clientFetch } from "./http";
import type { ClientDebtSummary, ClientReceivableOrder } from "./types";

export const clientCollectionsApi = {
  list(
    params: { skip?: number; take?: number } = {},
  ): Promise<{ items: ClientReceivableOrder[]; total: number }> {
    const sp = new URLSearchParams();
    if (params.skip !== undefined) sp.set("skip", String(params.skip));
    if (params.take !== undefined) sp.set("take", String(params.take));
    const qs = sp.toString();
    return clientFetch<{ items: ClientReceivableOrder[]; total: number }>(
      `/portal/collections/orders${qs ? `?${qs}` : ""}`,
    );
  },

  summary(): Promise<ClientDebtSummary> {
    return clientFetch<ClientDebtSummary>("/portal/collections/summary");
  },
};

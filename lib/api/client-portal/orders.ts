import { clientFetch } from "./http";
import type {
  ClientOrderDetail,
  ClientOrderListItem,
  ClientOrderStatus,
} from "./types";

export const clientOrdersApi = {
  list(
    params: { status?: ClientOrderStatus; skip?: number; take?: number } = {},
  ): Promise<{ items: ClientOrderListItem[]; total: number }> {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.skip !== undefined) sp.set("skip", String(params.skip));
    if (params.take !== undefined) sp.set("take", String(params.take));
    const qs = sp.toString();
    return clientFetch<{ items: ClientOrderListItem[]; total: number }>(
      `/portal/orders${qs ? `?${qs}` : ""}`,
    );
  },

  get(idOrFolio: string): Promise<ClientOrderDetail> {
    return clientFetch<ClientOrderDetail>(
      `/portal/orders/${encodeURIComponent(idOrFolio)}`,
    );
  },
};

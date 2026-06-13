import { apiFetch } from "./client";
import type { ApiProductionItem, ApiProductionStation } from "./types";

export const productionApi = {
  /** Cola del taller: jobs no entregados de órdenes vivas. */
  queue(): Promise<{ items: ApiProductionItem[] }> {
    return apiFetch<{ items: ApiProductionItem[] }>("/production/queue");
  },

  /** Asigna (o limpia con null) la estación de un job. */
  assignStation(
    orderId: string,
    itemId: string,
    station: ApiProductionStation | null,
  ): Promise<{ itemId: string; station: ApiProductionStation | null }> {
    return apiFetch(`/orders/${orderId}/items/${itemId}/station`, {
      method: "PATCH",
      body: JSON.stringify({ station }),
    });
  },
};

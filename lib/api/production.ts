import { apiFetch } from "./client";
import type {
  ApiOrderStatus,
  ApiProductionItem,
  ApiProductionStation,
} from "./types";

export type ProductionQueueParams = {
  /** Una estación, o 'unassigned' para los jobs sin asignar. */
  station?: ApiProductionStation | "unassigned";
  /** Solo jobs con entrega vencida. */
  overdue?: boolean;
  /** Filtra por etapa del pipeline. */
  status?: ApiOrderStatus;
  skip?: number;
  take?: number;
};

export const productionApi = {
  /** Cola del taller: jobs no entregados de órdenes vivas, con filtros y paginación. */
  queue(
    params: ProductionQueueParams = {},
  ): Promise<{ items: ApiProductionItem[]; total: number }> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return apiFetch<{ items: ApiProductionItem[]; total: number }>(
      `/production/queue${qs ? `?${qs}` : ""}`,
    );
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

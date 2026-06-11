import { apiFetch } from "./client";
import type { ApiProductionItem } from "./types";

export const productionApi = {
  /** Cola del taller: jobs no entregados de órdenes vivas. */
  queue(): Promise<{ items: ApiProductionItem[] }> {
    return apiFetch<{ items: ApiProductionItem[] }>("/production/queue");
  },
};

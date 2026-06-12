import type { ApiAuditEntry } from "./audit";
import { apiFetch } from "./client";
import type {
  ApiList,
  ApiMaterialDemand,
  ApiPurchaseOrder,
  ApiPurchaseOrderDetail,
  ApiPurchaseStatus,
} from "./types";

/** Línea de OC: material de catálogo (+variante) o línea libre (description). */
export type PurchaseLineInput = {
  /** Presente ⇒ línea de catálogo. Ausente ⇒ línea libre (requiere description). */
  materialId?: string;
  /** Talla (sólo catálogo con variantes). */
  materialVariantId?: string;
  /** Nombre/descripción de la línea libre. */
  description?: string;
  qty: number;
  unitCost: number;
};

export type PurchaseOrderInput = {
  supplierId: string;
  lines: PurchaseLineInput[];
  discount?: number;
  tax?: number;
  expectedDate?: string;
  notes?: string;
};

export type ListPurchasesParams = {
  status?: ApiPurchaseStatus;
  supplierId?: string;
  /** Busca por folio o nombre de proveedor. */
  search?: string;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
};

type StatusResult = { purchaseOrderId: string; status: ApiPurchaseStatus };

export const purchasesApi = {
  list(params: ListPurchasesParams = {}): Promise<ApiList<ApiPurchaseOrder>> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return apiFetch<ApiList<ApiPurchaseOrder>>(`/purchases${qs ? `?${qs}` : ""}`);
  },

  /** Acepta UUID o folio (OC-1001). */
  get(idOrFolio: string): Promise<ApiPurchaseOrderDetail> {
    return apiFetch<ApiPurchaseOrderDetail>(`/purchases/${idOrFolio}`);
  },

  timeline(idOrFolio: string): Promise<{ items: ApiAuditEntry[] }> {
    return apiFetch<{ items: ApiAuditEntry[] }>(
      `/purchases/${idOrFolio}/timeline`,
    );
  },

  create(
    input: PurchaseOrderInput,
  ): Promise<{ purchaseOrderId: string; folio: string }> {
    return apiFetch<{ purchaseOrderId: string; folio: string }>("/purchases", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Sólo borradores. */
  update(
    id: string,
    input: PurchaseOrderInput,
  ): Promise<{ purchaseOrderId: string }> {
    return apiFetch<{ purchaseOrderId: string }>(`/purchases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  send(id: string): Promise<StatusResult> {
    return apiFetch<StatusResult>(`/purchases/${id}/send`, { method: "POST" });
  },

  receive(
    id: string,
  ): Promise<{ purchaseOrderId: string; status: ApiPurchaseStatus; received: boolean }> {
    return apiFetch(`/purchases/${id}/receive`, { method: "POST" });
  },

  cancel(id: string, reason?: string): Promise<StatusResult> {
    return apiFetch<StatusResult>(`/purchases/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  /** "Por comprar": demanda pendiente de insumos bajo demanda (de los pedidos). */
  listDemand(): Promise<{ items: ApiMaterialDemand[] }> {
    return apiFetch<{ items: ApiMaterialDemand[] }>("/purchases/demand");
  },

  /** Crea una OC (de UN proveedor) sembrada con la demanda seleccionada. */
  createOrdersFromDemand(input: {
    supplierId: string;
    demandIds: string[];
    expectedDate?: string;
    notes?: string;
  }): Promise<{ purchaseOrderId: string; folio: string }> {
    return apiFetch<{ purchaseOrderId: string; folio: string }>(
      "/purchases/demand/create-orders",
      { method: "POST", body: JSON.stringify(input) },
    );
  },
};

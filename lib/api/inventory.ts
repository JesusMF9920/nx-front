import { apiFetch } from "./client";
import type {
  ApiList,
  ApiMaterial,
  ApiStockMove,
  ApiStockMoveType,
} from "./types";

export type CreateMaterialInput = {
  sku: string;
  name: string;
  category: string;
  unit?: string;
  initialStock?: number;
  reorderPoint?: number;
  cost: number;
  location?: string | null;
  supplierName?: string | null;
};

export type UpdateMaterialInput = {
  sku?: string;
  name?: string;
  category?: string;
  unit?: string;
  reorderPoint?: number;
  cost?: number;
  location?: string | null;
  supplierName?: string | null;
};

export type ListMaterialsParams = {
  skip?: number;
  take?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  orderBy?: "name" | "sku" | "stock" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
};

export type RecordStockMoveInput = {
  type: ApiStockMoveType;
  /** Decimal con hasta 3 decimales. */
  qty: number;
  /** Obligatorio si el material tiene variantes; prohibido si no. */
  materialVariantId?: string | null;
  ref?: string | null;
  note?: string | null;
};

export type MaterialVariantInput = {
  code: string;
  label: string;
  sortOrder?: number;
};

export const inventoryApi = {
  list(params: ListMaterialsParams = {}): Promise<ApiList<ApiMaterial>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    if (params.search?.trim()) search.set("search", params.search.trim());
    if (params.category) search.set("category", params.category);
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
    if (params.orderBy) search.set("orderBy", params.orderBy);
    if (params.order) search.set("order", params.order);
    const qs = search.toString();
    return apiFetch<ApiList<ApiMaterial>>(`/materials${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<ApiMaterial> {
    return apiFetch<ApiMaterial>(`/materials/${id}`);
  },

  create(input: CreateMaterialInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/materials", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateMaterialInput): Promise<void> {
    return apiFetch<void>(`/materials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/materials/${id}`, { method: "DELETE" });
  },

  activate(id: string): Promise<void> {
    return apiFetch<void>(`/materials/${id}/activate`, { method: "POST" });
  },

  /**
   * Replace-all con upsert por code. El backend exige stock 0 para la primera
   * transición a variantes y rechaza (409) quitar una variante con stock ≠ 0.
   */
  setVariants(
    materialId: string,
    variants: MaterialVariantInput[],
  ): Promise<void> {
    return apiFetch<void>(`/materials/${materialId}/variants`, {
      method: "PUT",
      body: JSON.stringify({ variants }),
    });
  },

  recordStockMove(
    materialId: string,
    input: RecordStockMoveInput,
  ): Promise<{ id: string; resultingStock: number }> {
    return apiFetch<{ id: string; resultingStock: number }>(
      `/materials/${materialId}/stock-moves`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  listStockMoves(
    materialId: string,
    params: { skip?: number; take?: number } = {},
  ): Promise<ApiList<ApiStockMove>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    const qs = search.toString();
    return apiFetch<ApiList<ApiStockMove>>(
      `/materials/${materialId}/stock-moves${qs ? `?${qs}` : ""}`,
    );
  },
};

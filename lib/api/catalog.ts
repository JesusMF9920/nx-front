import { apiFetch } from "./client";
import type { ApiList, ApiProduct, ApiProductSource } from "./types";

export type CreateProductInput = {
  sku: string;
  name: string;
  category: string;
  method?: string | null;
  source: ApiProductSource;
  supplierName?: string | null;
  leadDays?: number;
  price: number;
  cost: number;
  stock?: number;
  unit?: string;
  needsApproval?: boolean;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type ListProductsParams = {
  skip?: number;
  take?: number;
  search?: string;
  category?: string;
  source?: ApiProductSource;
  isActive?: boolean;
  orderBy?: "name" | "sku" | "createdAt" | "updatedAt" | "price" | "stock";
  order?: "asc" | "desc";
};

export const catalogApi = {
  list(params: ListProductsParams = {}): Promise<ApiList<ApiProduct>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    if (params.search?.trim()) search.set("search", params.search.trim());
    if (params.category) search.set("category", params.category);
    if (params.source) search.set("source", params.source);
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
    if (params.orderBy) search.set("orderBy", params.orderBy);
    if (params.order) search.set("order", params.order);
    const qs = search.toString();
    return apiFetch<ApiList<ApiProduct>>(`/products${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<ApiProduct> {
    return apiFetch<ApiProduct>(`/products/${id}`);
  },

  create(input: CreateProductInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/products", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateProductInput): Promise<void> {
    return apiFetch<void>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
  },

  activate(id: string): Promise<void> {
    return apiFetch<void>(`/products/${id}/activate`, { method: "POST" });
  },
};

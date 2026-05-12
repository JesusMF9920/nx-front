import { apiFetch } from "./client";
import type { ApiList, ApiSupplier } from "./types";

export type CreateSupplierInput = {
  name: string;
  service?: string | null;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  rfc?: string | null;
  leadDays?: number;
  reliability?: number;
  notes?: string | null;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export type ListSuppliersParams = {
  skip?: number;
  take?: number;
  search?: string;
  isActive?: boolean;
  orderBy?: "name" | "leadDays" | "reliability" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
};

export const suppliersApi = {
  list(params: ListSuppliersParams = {}): Promise<ApiList<ApiSupplier>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    if (params.search?.trim()) search.set("search", params.search.trim());
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
    if (params.orderBy) search.set("orderBy", params.orderBy);
    if (params.order) search.set("order", params.order);
    const qs = search.toString();
    return apiFetch<ApiList<ApiSupplier>>(`/suppliers${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<ApiSupplier> {
    return apiFetch<ApiSupplier>(`/suppliers/${id}`);
  },

  create(input: CreateSupplierInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/suppliers", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateSupplierInput): Promise<void> {
    return apiFetch<void>(`/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/suppliers/${id}`, { method: "DELETE" });
  },

  activate(id: string): Promise<void> {
    return apiFetch<void>(`/suppliers/${id}/activate`, { method: "POST" });
  },
};

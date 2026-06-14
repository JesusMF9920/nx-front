import { apiFetch } from "./client";
import type { ApiClient, ApiClientType, ApiList } from "./types";

export type CreateClientInput = {
  name: string;
  type: ApiClientType;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  rfc?: string | null;
  taxRegimen?: string | null;
  fiscalName?: string | null;
  usoCFDI?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  tags?: string[];
  additionalPhones?: string[];
  additionalEmails?: string[];
};

export type UpdateClientInput = Partial<CreateClientInput>;

export type ClientAddressInput = {
  type: "billing" | "delivery" | "other";
  label?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type ListClientsParams = {
  skip?: number;
  take?: number;
  search?: string;
  tag?: string;
  tagStartsWith?: string;
  isActive?: boolean;
  type?: ApiClientType;
  orderBy?: "name" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
};

export const clientsApi = {
  list(params: ListClientsParams = {}): Promise<ApiList<ApiClient>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    if (params.search && params.search.trim().length > 0) {
      search.set("search", params.search.trim());
    }
    if (params.tag) search.set("tag", params.tag);
    if (params.tagStartsWith) search.set("tagStartsWith", params.tagStartsWith);
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
    if (params.type) search.set("type", params.type);
    if (params.orderBy) search.set("orderBy", params.orderBy);
    if (params.order) search.set("order", params.order);
    const qs = search.toString();
    return apiFetch<ApiList<ApiClient>>(`/clients${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<ApiClient> {
    return apiFetch<ApiClient>(`/clients/${id}`);
  },

  create(input: CreateClientInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/clients", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateClientInput): Promise<void> {
    return apiFetch<void>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/clients/${id}`, { method: "DELETE" });
  },

  activate(id: string): Promise<void> {
    return apiFetch<void>(`/clients/${id}/activate`, { method: "POST" });
  },

  addAddress(
    clientId: string,
    input: ClientAddressInput,
  ): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/clients/${clientId}/addresses`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateAddress(
    clientId: string,
    addressId: string,
    patch: Partial<ClientAddressInput>,
  ): Promise<void> {
    return apiFetch<void>(`/clients/${clientId}/addresses/${addressId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  removeAddress(clientId: string, addressId: string): Promise<void> {
    return apiFetch<void>(`/clients/${clientId}/addresses/${addressId}`, {
      method: "DELETE",
    });
  },

  /** URL absoluta para `<a download>` (sin token — el browser usa el cookie/header del cliente). */
  exportCsvUrl(params: ListClientsParams = {}): string {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    const search = new URLSearchParams();
    if (params.search) search.set("search", params.search);
    if (params.tag) search.set("tag", params.tag);
    if (params.tagStartsWith) search.set("tagStartsWith", params.tagStartsWith);
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
    if (params.type) search.set("type", params.type);
    if (params.orderBy) search.set("orderBy", params.orderBy);
    if (params.order) search.set("order", params.order);
    const qs = search.toString();
    return `${base}/clients/export.csv${qs ? `?${qs}` : ""}`;
  },
};

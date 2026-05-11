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
  notes?: string | null;
  tags?: string[];
};

export type UpdateClientInput = Partial<CreateClientInput>;

export type ListClientsParams = {
  skip?: number;
  take?: number;
  search?: string;
  tag?: string;
  isActive?: boolean;
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
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
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
};

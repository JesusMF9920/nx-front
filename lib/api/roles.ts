import { apiFetch } from "./client";
import type { ApiRole } from "./types";

export type CreateRoleInput = {
  name: string;
  description?: string | null;
  permissions: string[];
};

export type UpdateRoleInput = {
  name?: string;
  description?: string | null;
  permissions?: string[];
};

export const rolesApi = {
  list(): Promise<ApiRole[]> {
    return apiFetch<ApiRole[]>("/roles");
  },

  get(id: string): Promise<ApiRole> {
    return apiFetch<ApiRole>(`/roles/${id}`);
  },

  create(input: CreateRoleInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/roles", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateRoleInput): Promise<void> {
    return apiFetch<void>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/roles/${id}`, { method: "DELETE" });
  },

  assign(roleId: string, userId: string): Promise<void> {
    return apiFetch<void>(`/roles/${roleId}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  revoke(roleId: string, userId: string): Promise<void> {
    return apiFetch<void>(`/roles/${roleId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
};

import { apiFetch } from "./client";
import type { ApiList, ApiUser } from "./types";

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
};

export type UpdateUserInput = {
  email?: string;
  name?: string;
};

export const usersApi = {
  list(params: { skip?: number; take?: number } = {}): Promise<ApiList<ApiUser>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    const qs = search.toString();
    return apiFetch<ApiList<ApiUser>>(`/users${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<ApiUser> {
    return apiFetch<ApiUser>(`/users/${id}`);
  },

  create(input: CreateUserInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateUserInput): Promise<void> {
    return apiFetch<void>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/users/${id}`, { method: "DELETE" });
  },

  activate(id: string): Promise<void> {
    return apiFetch<void>(`/users/${id}/activate`, { method: "POST" });
  },

  resetPassword(id: string, newPassword: string): Promise<void> {
    return apiFetch<void>(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  },
};

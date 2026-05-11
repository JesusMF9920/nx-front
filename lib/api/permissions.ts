import { apiFetch } from "./client";

export type ApiPermission = {
  id: string;
  group: string;
  label: string;
};

export const permissionsApi = {
  catalog(): Promise<{ items: ApiPermission[] }> {
    return apiFetch<{ items: ApiPermission[] }>("/permissions/catalog");
  },
};

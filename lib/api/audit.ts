import { apiFetch } from "./client";

export type ApiAuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ListAuditParams = {
  actorId?: string;
  action?: string;
  target?: string;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
};

export const auditApi = {
  list(
    params: ListAuditParams = {},
  ): Promise<{ items: ApiAuditEntry[]; total: number }> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return apiFetch<{ items: ApiAuditEntry[]; total: number }>(
      `/audit${qs ? `?${qs}` : ""}`,
    );
  },
};

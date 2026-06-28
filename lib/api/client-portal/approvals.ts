import { clientFetch } from "./http";
import type {
  ClientApprovalDetail,
  ClientApprovalListItem,
} from "./types";

export const clientApprovalsApi = {
  list(): Promise<ClientApprovalListItem[]> {
    return clientFetch<ClientApprovalListItem[]>("/portal/approvals");
  },

  get(proofId: string): Promise<ClientApprovalDetail> {
    return clientFetch<ClientApprovalDetail>(
      `/portal/approvals/${encodeURIComponent(proofId)}`,
    );
  },

  decide(
    proofId: string,
    decision: "approve" | "request_changes",
    comment?: string,
  ): Promise<{ decision: string; proofStatus: string }> {
    return clientFetch<{ decision: string; proofStatus: string }>(
      `/portal/approvals/${encodeURIComponent(proofId)}/decision`,
      { method: "POST", body: JSON.stringify({ decision, comment }) },
    );
  },
};

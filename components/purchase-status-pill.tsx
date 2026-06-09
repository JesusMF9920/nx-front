import { PURCHASE_STATUS_ES } from "@/lib/api/purchases-mappers";
import type { ApiPurchaseStatus } from "@/lib/api/types";

const CLS: Record<ApiPurchaseStatus, string> = {
  draft: "pill--neutral",
  sent: "pill--info",
  received: "pill--ok",
  cancelled: "pill--danger",
};

export function PurchaseStatusPill({ status }: { status: ApiPurchaseStatus }) {
  return (
    <span className={`pill ${CLS[status]}`}>{PURCHASE_STATUS_ES[status]}</span>
  );
}

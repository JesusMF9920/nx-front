import { QUOTE_STATUS_ES } from "@/lib/api/sales-mappers";
import type { ApiQuoteStatus } from "@/lib/api/types";

const CLS: Record<ApiQuoteStatus, string> = {
  draft: "pill--neutral",
  sent: "pill--info",
  approved: "pill--ok",
  rejected: "pill--danger",
  converted: "pill--accent",
};

/**
 * "Vencida" es derivada (isExpired) y nunca se almacena: tiene prioridad
 * visual sobre el status real (que sería "Enviada"/"Aprobada").
 */
export function QuoteStatusPill({
  status,
  isExpired,
}: {
  status: ApiQuoteStatus;
  isExpired?: boolean;
}) {
  if (isExpired) return <span className="pill pill--warn">Vencida</span>;
  const label = status === "converted" ? "→ Pedido" : QUOTE_STATUS_ES[status];
  return <span className={`pill ${CLS[status]}`}>{label}</span>;
}

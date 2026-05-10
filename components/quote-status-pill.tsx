import type { QuoteStatus } from "@/lib/types";

const MAP: Record<QuoteStatus, { cls: string; label?: string }> = {
  Aprobada:   { cls: "pill--ok" },
  Enviada:    { cls: "pill--info" },
  Convertida: { cls: "pill--accent", label: "→ Pedido" },
  Rechazada:  { cls: "pill--danger" },
  Vencida:    { cls: "pill--warn" },
  Borrador:   { cls: "pill--neutral" },
};

export function QuoteStatusPill({ s }: { s: QuoteStatus }) {
  const { cls, label } = MAP[s];
  return <span className={`pill ${cls}`}>{label ?? s}</span>;
}

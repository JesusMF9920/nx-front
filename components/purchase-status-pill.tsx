import type { PurchaseStatus } from "@/lib/types";

const MAP: Record<PurchaseStatus, string> = {
  Recibida: "pill--ok",
  Enviada: "pill--info",
  "Recibida parcial": "pill--warn",
  Borrador: "pill--neutral",
  Cancelada: "pill--danger",
};

export function PurchaseStatusPill({ s }: { s: PurchaseStatus }) {
  return <span className={`pill ${MAP[s] ?? "pill--neutral"}`}>{s}</span>;
}

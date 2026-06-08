import type { OrderStatus } from "@/lib/types";

/**
 * Etiquetas ES de estatus de pedido: el union mock + "Cancelada" (que solo
 * existe en la API — ORDER_STATUS_ES de lib/api/sales-mappers).
 */
export type OrderStatusLabel = OrderStatus | "Cancelada";

const STATUS_CLASS: Record<OrderStatusLabel, string> = {
  "En diseño":          "pill--info",
  "Aprobación cliente": "pill--warn",
  "Producción":         "pill--accent",
  "Listo para entrega": "pill--ok",
  "Entregado":          "pill--neutral",
  "Con proveedor":      "pill--supplier",
  "Pendiente":          "pill--danger",
  "Cancelada":          "pill--danger",
};

export function StatusPill({ s, supplier }: { s: string; supplier?: boolean }) {
  const cls = STATUS_CLASS[s as OrderStatusLabel] ?? "pill--neutral";
  return (
    <span className={`pill ${cls}`} style={{ display: "inline-flex" }}>
      {s}
      {supplier && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.8 }}>•Prov.</span>}
    </span>
  );
}

import type { OrderStatus } from "@/lib/types";

const STATUS_CLASS: Record<OrderStatus, string> = {
  "En diseño":          "pill--info",
  "Aprobación cliente": "pill--warn",
  "Producción":         "pill--accent",
  "Listo para entrega": "pill--ok",
  "Entregado":          "pill--neutral",
  "Con proveedor":      "pill--supplier",
  "Pendiente":          "pill--danger",
};

export function StatusPill({ s, supplier }: { s: OrderStatus; supplier?: boolean }) {
  const cls = STATUS_CLASS[s] ?? "pill--neutral";
  return (
    <span className={`pill ${cls}`} style={{ display: "inline-flex" }}>
      {s}
      {supplier && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.8 }}>•Prov.</span>}
    </span>
  );
}

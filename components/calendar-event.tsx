import Link from "next/link";
import type { Delivery, OrderStatus } from "@/lib/types";

const PALETTE: Partial<Record<OrderStatus, [string, string]>> = {
  "En diseño":          ["#0c5b9e", "var(--info-soft)"],
  "Aprobación cliente": ["#a85b00", "var(--warn-soft)"],
  "Producción":         ["#3d3df0", "var(--accent-soft)"],
  "Listo para entrega": ["#1f7a4d", "var(--ok-soft)"],
  "Con proveedor":      ["#6e3ab8", "var(--supplier-soft)"],
};

export function CalendarEvent({ ev }: { ev: Delivery }) {
  const [fg, bg] = PALETTE[ev.status] ?? ["var(--ink-2)", "var(--surface-3)"];
  return (
    <Link
      href={`/orders/${ev.id}`}
      style={{
        background: bg,
        borderLeft: `3px solid ${fg}`,
        padding: "6px 8px",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 12,
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: fg,
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
        }}
      >
        {ev.time}
        {ev.supplier && <span style={{ marginLeft: "auto", fontSize: 9 }}>PROV</span>}
      </div>
      <div style={{ fontWeight: 500, color: "var(--ink)" }}>{ev.client}</div>
      <div
        style={{
          color: "var(--muted)",
          fontSize: 11,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {ev.id} · {ev.items}
      </div>
    </Link>
  );
}

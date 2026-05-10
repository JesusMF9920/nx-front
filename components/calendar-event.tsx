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
      className="block cursor-pointer text-xs no-underline text-inherit"
      style={{
        background: bg,
        borderLeft: `3px solid ${fg}`,
        padding: "6px 8px",
        borderRadius: 4,
      }}
    >
      <div
        className="flex items-center gap-1 font-semibold font-mono"
        style={{ color: fg }}
      >
        {ev.time}
        {ev.supplier && <span className="ml-auto text-[9px]">PROV</span>}
      </div>
      <div className="font-medium text-ink">{ev.client}</div>
      <div className="text-muted text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
        {ev.id} · {ev.items}
      </div>
    </Link>
  );
}

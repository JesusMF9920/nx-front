import Link from "next/link";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type { ApiOrder, ApiOrderStatus } from "@/lib/api/types";

// fg = token de estado (no hex fijo) para que el borde y el texto se adapten al
// modo oscuro junto con el fondo `-soft`.
const PALETTE: Partial<Record<ApiOrderStatus, [string, string]>> = {
  in_design: ["var(--info)", "var(--info-soft)"],
  client_approval: ["var(--warn)", "var(--warn-soft)"],
  production: ["var(--accent)", "var(--accent-soft)"],
  ready_for_delivery: ["var(--ok)", "var(--ok-soft)"],
  with_supplier: ["var(--supplier)", "var(--supplier-soft)"],
};

export function CalendarEvent({ order }: { order: ApiOrder }) {
  const [fg, bg] = PALETTE[order.status] ?? [
    "var(--ink-2)",
    "var(--surface-3)",
  ];
  return (
    <Link
      href={`/orders/${order.folio}`}
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
        {order.folio}
        {order.status === "with_supplier" && (
          <span className="ml-auto text-[9px]">PROV</span>
        )}
      </div>
      <div className="font-medium text-ink">{order.clientName}</div>
      <div className="text-muted text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
        {order.itemsCount} {order.itemsCount === 1 ? "producto" : "productos"} ·{" "}
        {ORDER_STATUS_ES[order.status]}
      </div>
    </Link>
  );
}

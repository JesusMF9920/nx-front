import Link from "next/link";
import { PriorityPill } from "./priority-pill";
import type { ApiOrder } from "@/lib/api/types";
import { fmtDate, fmtMXN } from "@/lib/format";

function isOverdue(order: ApiOrder): boolean {
  if (!order.deliverAt) return false;
  if (order.status === "delivered" || order.status === "cancelled") return false;
  return new Date(order.deliverAt).getTime() < Date.now();
}

/** Tarjeta de pedido para el tablero Kanban. */
export function OrderBoardCard({ order }: { order: ApiOrder }) {
  const overdue = isOverdue(order);
  return (
    <Link
      href={`/orders/${order.folio}`}
      className="card"
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        padding: 10,
        borderLeft: order.priority === "urgent"
          ? "3px solid var(--danger)"
          : "3px solid transparent",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        <span className="num" style={{ color: "var(--accent)", fontSize: 13 }}>
          {order.folio}
        </span>
        <div className="spacer" />
        <PriorityPill priority={order.priority} />
      </div>
      <div className="text-sm" style={{ marginBottom: 6 }}>
        {order.clientName}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span>{fmtMXN(order.total)}</span>
        <div className="spacer" />
        <span style={overdue ? { color: "var(--danger)", fontWeight: 600 } : undefined}>
          {order.deliverAt ? fmtDate(order.deliverAt) : "Sin fecha"}
        </span>
      </div>
      <div className="text-[11px] text-muted" style={{ marginTop: 4 }}>
        {order.designerName || order.producerName ? (
          <>
            {order.designerName && <span>Diseño: {order.designerName}</span>}
            {order.designerName && order.producerName && <span> · </span>}
            {order.producerName && <span>Prod.: {order.producerName}</span>}
          </>
        ) : (
          <span style={{ color: "var(--warn)" }}>Sin responsable</span>
        )}
      </div>
    </Link>
  );
}

"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import type { CSSProperties } from "react";
import { I } from "./icons";
import { MenuButton, type MenuItem } from "./menu-button";
import { PriorityPill } from "./priority-pill";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type { ApiOrder, ApiOrderPriority, ApiOrderStatus } from "@/lib/api/types";
import { fmtDate, fmtMXN } from "@/lib/format";

function isOverdue(order: ApiOrder): boolean {
  if (!order.deliverAt) return false;
  if (order.status === "delivered" || order.status === "cancelled") return false;
  return new Date(order.deliverAt).getTime() < Date.now();
}

/** Contenido visual de la tarjeta (compartido por la tarjeta y el DragOverlay). */
function CardBody({ order }: { order: ApiOrder }) {
  const overdue = isOverdue(order);
  return (
    <>
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
        <span
          style={overdue ? { color: "var(--danger)", fontWeight: 600 } : undefined}
        >
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
    </>
  );
}

const cardStyle = (order: ApiOrder): CSSProperties => ({
  padding: 10,
  borderLeft:
    order.priority === "urgent"
      ? "3px solid var(--danger)"
      : "3px solid transparent",
});

/** Versión presentacional (sin drag ni menú) — la usa el DragOverlay. */
export function OrderBoardCardView({ order }: { order: ApiOrder }) {
  return (
    <div
      className="card"
      style={{ ...cardStyle(order), boxShadow: "var(--sh-lg)", width: 240 }}
    >
      <CardBody order={order} />
    </div>
  );
}

export type OrderBoardCardProps = {
  order: ApiOrder;
  canManage: boolean;
  canAssign: boolean;
  /** Etapas hacia adelante a las que se puede mover (para el menú). */
  forwardStages: ApiOrderStatus[];
  onMove: (orderId: string, status: ApiOrderStatus) => void;
  onSetPriority: (orderId: string, priority: ApiOrderPriority) => void;
  onAssign: (order: ApiOrder) => void;
};

/** Tarjeta de pedido del tablero: arrastrable (dnd-kit) + menú de acciones. */
export function OrderBoardCard({
  order,
  canManage,
  canAssign,
  forwardStages,
  onMove,
  onSetPriority,
  onAssign,
}: OrderBoardCardProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
    disabled: !canManage,
  });

  const items: MenuItem[] = [];
  if (canManage) {
    for (const s of forwardStages) {
      items.push({
        label: `Mover a ${ORDER_STATUS_ES[s]}`,
        icon: I.arrowRight,
        onClick: () => onMove(order.id, s),
      });
    }
  }
  if (canAssign) {
    items.push(
      order.priority === "urgent"
        ? {
            label: "Quitar urgente",
            icon: I.clock,
            onClick: () => onSetPriority(order.id, "normal"),
          }
        : {
            label: "Marcar urgente",
            icon: I.clock,
            onClick: () => onSetPriority(order.id, "urgent"),
          },
    );
    items.push({
      label: "Asignar responsable…",
      icon: I.user,
      onClick: () => onAssign(order),
    });
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="card"
      style={{
        ...cardStyle(order),
        opacity: isDragging ? 0.4 : 1,
        cursor: canManage ? "grab" : "default",
      }}
    >
      <div className="flex items-start gap-1">
        <Link
          href={`/orders/${order.folio}`}
          draggable={false}
          className="flex-1 min-w-0"
          style={{ textDecoration: "none", color: "inherit", display: "block" }}
        >
          <CardBody order={order} />
        </Link>
        {items.length > 0 && (
          <MenuButton
            trigger={I.more}
            items={items}
            ariaLabel={`Acciones del pedido ${order.folio}`}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  OrderBoardCard,
  OrderBoardCardView,
} from "@/components/order-board-card";
import { AssigneeSelect } from "@/components/assignee-select";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { usePermission } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type {
  ApiAssignableUser,
  ApiOrder,
  ApiOrderPriority,
  ApiOrderStatus,
} from "@/lib/api/types";
import { fmtInt } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";

/** Etapas del pipeline en orden; "cancelled" no entra al tablero. */
const COLUMNS: ApiOrderStatus[] = [
  "pending",
  "in_design",
  "client_approval",
  "production",
  "with_supplier",
  "ready_for_delivery",
  "delivered",
];

/** Tope de tarjetas por columna (el tablero no pagina). */
const PER_COLUMN = 50;

type ColumnState = { items: ApiOrder[]; total: number };

/** Urgentes primero; luego por entrega más próxima (sin fecha al final). */
function compareCards(a: ApiOrder, b: ApiOrder): number {
  const pa = a.priority === "urgent" ? 0 : 1;
  const pb = b.priority === "urgent" ? 0 : 1;
  if (pa !== pb) return pa - pb;
  const ta = a.deliverAt ? new Date(a.deliverAt).getTime() : Number.POSITIVE_INFINITY;
  const tb = b.deliverAt ? new Date(b.deliverAt).getTime() : Number.POSITIVE_INFINITY;
  return ta - tb;
}

/** Mueve un pedido a la columna `target` (optimista): lo saca de su columna
 *  actual, ajusta su status y reordena el destino. Sin tocar el resto. */
function moveOrder(
  cols: Record<string, ColumnState>,
  orderId: string,
  target: ApiOrderStatus,
): Record<string, ColumnState> {
  const next: Record<string, ColumnState> = { ...cols };
  let moved: ApiOrder | undefined;
  for (const status of COLUMNS) {
    const col = next[status];
    const found = col?.items.find((o) => o.id === orderId);
    if (found) {
      moved = { ...found, status: target };
      next[status] = {
        items: col.items.filter((o) => o.id !== orderId),
        total: Math.max(0, col.total - 1),
      };
      break;
    }
  }
  if (moved) {
    const col = next[target] ?? { items: [], total: 0 };
    next[target] = {
      items: [...col.items, moved].sort(compareCards),
      total: col.total + 1,
    };
  }
  return next;
}

/** Actualiza un pedido en su columna (optimista) y la reordena. */
function patchOrder(
  cols: Record<string, ColumnState>,
  orderId: string,
  patch: Partial<ApiOrder>,
): Record<string, ColumnState> {
  const next: Record<string, ColumnState> = { ...cols };
  for (const status of COLUMNS) {
    const col = next[status];
    if (!col) continue;
    const idx = col.items.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      const items = [...col.items];
      items[idx] = { ...items[idx], ...patch };
      next[status] = { items: items.sort(compareCards), total: col.total };
      break;
    }
  }
  return next;
}

/** Columna soltable (droppable) — resalta cuando es un destino válido. */
function Column({
  status,
  count,
  validTarget,
  children,
}: {
  status: ApiOrderStatus;
  count: number;
  validTarget: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const highlight = isOver && validTarget;
  return (
    <div
      ref={setNodeRef}
      style={{
        width: 240,
        flex: "0 0 240px",
        borderRadius: 8,
        outline: highlight ? "2px dashed var(--accent)" : "2px dashed transparent",
        background: highlight ? "var(--surface-2)" : undefined,
        transition: "background .12s, outline-color .12s",
      }}
      className="flex flex-col gap-2"
    >
      <div
        className="flex items-center gap-2"
        style={{
          padding: "6px 8px",
          borderBottom: "2px solid var(--line)",
          position: "sticky",
          top: 0,
        }}
      >
        <span className="font-medium text-sm">{ORDER_STATUS_ES[status]}</span>
        <div className="spacer" />
        <span className="text-muted text-xs">{fmtInt(count)}</span>
      </div>
      {children}
    </div>
  );
}

export default function BoardPage() {
  const toast = useToast();
  const canManage = usePermission("sales.orders.manage");
  const canAssign = usePermission("sales.orders.assign");

  const [columns, setColumns] = useState<Record<string, ColumnState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<ApiOrder | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

  // Press-and-hold para arrastrar en táctil (el swipe sigue haciendo scroll);
  // en escritorio, arrastrar tras mover 8px (un click simple navega al detalle).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      // Refresco silencioso (tras una acción): no blanquea el tablero con el
      // skeleton de "Cargando…"; sólo intercambia los datos al volver.
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const results = await Promise.all(
          COLUMNS.map((status) =>
            ordersApi.list({
              status,
              take: PER_COLUMN,
              mine: mine || undefined,
              assigneeId: assigneeId || undefined,
              priority: urgentOnly ? "urgent" : undefined,
            }),
          ),
        );
        const next: Record<string, ColumnState> = {};
        COLUMNS.forEach((status, i) => {
          next[status] = {
            items: [...results[i].items].sort(compareCards),
            total: results[i].total,
          };
        });
        setColumns(next);
      } catch {
        // En refresco silencioso conservamos el estado optimista (la acción ya
        // se aplicó en el servidor); sólo mostramos error en la carga inicial.
        if (!opts?.silent) setError("No se pudo cargar el tablero.");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [mine, urgentOnly, assigneeId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Usuarios asignables (para el filtro por persona y el modal). Endpoint
  // gateado por sales.orders.read, así no exige iam.users.read.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await ordersApi.assignableUsers();
        if (!cancelled) setUsers(res.items);
      } catch {
        /* sin lista si falla */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allOrders = useMemo(
    () => Object.values(columns).flatMap((c) => c.items),
    [columns],
  );
  const activeOrder = activeId
    ? (allOrders.find((o) => o.id === activeId) ?? null)
    : null;

  const move = async (orderId: string, status: ApiOrderStatus) => {
    const snapshot = columns;
    // Optimista: la tarjeta salta a la columna destino al instante.
    setColumns((c) => moveOrder(c, orderId, status));
    try {
      await ordersApi.transitionStatus(orderId, status);
      toast.success(`Pedido movido a ${ORDER_STATUS_ES[status]}`);
      await load({ silent: true });
    } catch (err) {
      setColumns(snapshot); // revierte si el servidor rechaza
      let msg = "No se pudo mover el pedido.";
      if (err instanceof ApiError) {
        msg = /invalid status transition/i.test(err.message)
          ? "No se puede avanzar el pedido a esa etapa."
          : err.message;
      }
      toast.error(msg);
    }
  };

  const setPriority = async (orderId: string, priority: ApiOrderPriority) => {
    const snapshot = columns;
    setColumns((c) => patchOrder(c, orderId, { priority }));
    try {
      await ordersApi.setPriority(orderId, priority);
      toast.success("Prioridad actualizada");
      await load({ silent: true });
    } catch (err) {
      setColumns(snapshot);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la prioridad.",
      );
    }
  };

  const assignRole = async (
    orderId: string,
    patch: { designerId?: string | null; producerId?: string | null },
  ) => {
    const snapshot = columns;
    // Optimista: aplica id y nombre (de la lista cargada) de inmediato.
    const visual: Partial<ApiOrder> = { ...patch };
    if ("designerId" in patch) {
      visual.designerName = patch.designerId
        ? (users.find((u) => u.id === patch.designerId)?.name ?? null)
        : null;
    }
    if ("producerId" in patch) {
      visual.producerName = patch.producerId
        ? (users.find((u) => u.id === patch.producerId)?.name ?? null)
        : null;
    }
    setColumns((c) => patchOrder(c, orderId, visual));
    // Refleja el cambio en el modal abierto sin esperar la recarga.
    setAssignTarget((prev) =>
      prev && prev.id === orderId ? { ...prev, ...patch } : prev,
    );
    setSavingAssign(true);
    try {
      await ordersApi.assign(orderId, patch);
      toast.success("Responsable actualizado");
      await load({ silent: true });
    } catch (err) {
      setColumns(snapshot);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el responsable.",
      );
    } finally {
      setSavingAssign(false);
    }
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const orderId = String(active.id);
    const target = String(over.id) as ApiOrderStatus;
    const order = allOrders.find((o) => o.id === orderId);
    if (!order || order.status === target) return;
    if (COLUMNS.indexOf(target) < COLUMNS.indexOf(order.status)) {
      toast.error("No se puede regresar el pedido a una etapa anterior.");
      return;
    }
    void move(orderId, target);
  };

  // Índice de la etapa que se arrastra, para resaltar sólo columnas hacia adelante.
  const activeStageIndex = activeOrder
    ? COLUMNS.indexOf(activeOrder.status)
    : -1;

  return (
    <>
      <PageHeader
        title="Tablero"
        sub="Todos los pedidos por etapa"
        actions={
          <button className="btn" type="button" onClick={() => void load()}>
            Actualizar
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5 mb-3" role="group">
        <button
          type="button"
          className={`btn btn--sm ${mine ? "btn--primary" : ""}`}
          aria-pressed={mine}
          onClick={() => {
            setMine((v) => !v);
            setAssigneeId(""); // "Mis pedidos" y filtro por persona se excluyen
          }}
        >
          Mis pedidos
        </button>
        <select
          className="select"
          style={{ fontSize: 13, padding: "4px 8px", width: "auto" }}
          aria-label="Filtrar por responsable"
          value={assigneeId}
          onChange={(e) => {
            setAssigneeId(e.target.value);
            if (e.target.value) setMine(false);
          }}
        >
          <option value="">Responsable: todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`btn btn--sm ${urgentOnly ? "btn--primary" : ""}`}
          aria-pressed={urgentOnly}
          onClick={() => setUrgentOnly((v) => !v)}
        >
          Solo urgentes
        </button>
        {canManage && (
          <span className="text-muted text-xs ml-1">
            Arrastra una tarjeta para avanzar su etapa.
          </span>
        )}
      </div>

      {error && (
        <div
          className="card mb-3 flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{error}</span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => void load()}
          >
            Reintentar
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: "min-content" }}>
            {COLUMNS.map((status, index) => {
              const col = columns[status];
              const items = col?.items ?? [];
              const total = col?.total ?? 0;
              const validTarget = activeStageIndex >= 0 && index > activeStageIndex;
              return (
                <Column
                  key={status}
                  status={status}
                  count={total}
                  validTarget={validTarget}
                >
                  {loading ? (
                    <div className="text-muted text-xs" style={{ padding: 8 }}>
                      Cargando…
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-muted text-xs" style={{ padding: 8 }}>
                      —
                    </div>
                  ) : (
                    items.map((o) => (
                      <OrderBoardCard
                        key={o.id}
                        order={o}
                        canManage={canManage}
                        canAssign={canAssign}
                        forwardStages={COLUMNS.slice(index + 1)}
                        onMove={(id, s) => void move(id, s)}
                        onSetPriority={(id, p) => void setPriority(id, p)}
                        onAssign={(ord) => setAssignTarget(ord)}
                      />
                    ))
                  )}

                  {!loading && total > items.length && (
                    <div
                      className="text-muted text-[11px]"
                      style={{ padding: 8 }}
                    >
                      +{total - items.length} más
                    </div>
                  )}
                </Column>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeOrder ? <OrderBoardCardView order={activeOrder} /> : null}
        </DragOverlay>
      </DndContext>

      {assignTarget && (
        <Modal
          title={`Responsables · ${assignTarget.folio}`}
          width={420}
          onClose={() => setAssignTarget(null)}
          footer={
            <button
              className="btn"
              type="button"
              onClick={() => setAssignTarget(null)}
            >
              Cerrar
            </button>
          }
        >
          <div className="grid gap-3">
            <AssigneeSelect
              label="Responsable de diseño"
              value={assignTarget.designerId}
              users={users}
              disabled={savingAssign}
              onChange={(userId) =>
                void assignRole(assignTarget.id, { designerId: userId })
              }
            />
            <AssigneeSelect
              label="Responsable de producción"
              value={assignTarget.producerId}
              users={users}
              disabled={savingAssign}
              onChange={(userId) =>
                void assignRole(assignTarget.id, { producerId: userId })
              }
            />
            {users.length === 0 && (
              <span className="text-muted text-xs">
                No se pudo cargar la lista de usuarios.
              </span>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

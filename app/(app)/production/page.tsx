"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { usePermission } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { productionApi } from "@/lib/api/production";
import { MANUAL_ORDER_TRANSITIONS, ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type { ApiOrderStatus, ApiProductionItem } from "@/lib/api/types";
import { fmtDate, fmtInt } from "@/lib/format";

/** Etapas del taller en orden de avance (los entregados no entran a la cola). */
const PIPELINE: ApiOrderStatus[] = [
  "in_design",
  "client_approval",
  "production",
  "with_supplier",
  "ready_for_delivery",
];

export default function ProductionPage() {
  const canAdvance = usePermission("sales.production.advance");
  const [items, setItems] = useState<ApiProductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [itemBusy, setItemBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await productionApi.queue();
      setItems(res.items);
    } catch {
      setLoadError("No se pudo cargar la cola de producción.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const advance = async (item: ApiProductionItem, status: ApiOrderStatus) => {
    if (status === item.status) return;
    setItemBusy(item.itemId);
    setActionError(null);
    try {
      await ordersApi.transitionItemStatus(item.orderId, item.itemId, status);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "No se pudo avanzar el job.",
      );
    } finally {
      setItemBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Producción"
        sub={
          loading
            ? "Cargando…"
            : `${fmtInt(items.length)} job${items.length === 1 ? "" : "s"} en cola`
        }
        actions={
          <button className="btn" type="button" onClick={() => void load()}>
            {I.more} Actualizar
          </button>
        }
      />

      {(loadError || actionError) && (
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
          <span className="flex-1">{loadError ?? actionError}</span>
          {loadError && (
            <button
              className="btn btn--sm"
              type="button"
              onClick={() => void load()}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="card__body text-muted">Cargando cola…</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card__body text-muted">
            No hay jobs en producción. Las ventas nuevas aparecerán aquí.
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {PIPELINE.map((stage) => {
            const stageItems = items.filter((i) => i.status === stage);
            if (stageItems.length === 0) return null;
            return (
              <div className="card" key={stage}>
                <div className="card__head">
                  <StatusPill s={ORDER_STATUS_ES[stage]} />
                  <div className="card__title">{ORDER_STATUS_ES[stage]}</div>
                  <span className="text-muted text-xs">
                    {stageItems.length} job{stageItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="tbl min-w-[720px]">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Producto</th>
                        <th style={{ textAlign: "right" }}>Cant.</th>
                        <th>Origen</th>
                        <th>Entrega</th>
                        {canAdvance && <th>Avanzar</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stageItems.map((item) => (
                        <tr key={item.itemId}>
                          <td className="num">
                            <Link
                              href={`/orders/${item.orderFolio}`}
                              style={{ color: "var(--accent)" }}
                            >
                              {item.orderFolio}
                            </Link>
                          </td>
                          <td>{item.clientName}</td>
                          <td>
                            <div>{item.productName}</div>
                            <div className="text-muted text-[11px]">
                              {item.sku}
                              {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                            </div>
                          </td>
                          <td className="num" style={{ textAlign: "right" }}>
                            {item.qty}
                          </td>
                          <td>
                            {item.source === "supplier"
                              ? `Proveedor${item.supplierName ? ` · ${item.supplierName}` : ""}`
                              : "Interno"}
                          </td>
                          <td className="num">
                            {item.deliverAt ? fmtDate(item.deliverAt) : "Sin fecha"}
                          </td>
                          {canAdvance && (
                            <td>
                              <select
                                className="select"
                                style={{ fontSize: 12, padding: "2px 6px" }}
                                value={item.status}
                                disabled={itemBusy !== null}
                                onChange={(e) =>
                                  void advance(
                                    item,
                                    e.target.value as ApiOrderStatus,
                                  )
                                }
                                aria-label={`Avanzar ${item.productName} del pedido ${item.orderFolio}`}
                              >
                                {!MANUAL_ORDER_TRANSITIONS.includes(
                                  item.status,
                                ) && (
                                  <option value={item.status} disabled>
                                    {ORDER_STATUS_ES[item.status]}
                                  </option>
                                )}
                                {MANUAL_ORDER_TRANSITIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {ORDER_STATUS_ES[s]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

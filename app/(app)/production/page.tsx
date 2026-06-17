"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SkeletonTable } from "@/components/skeleton";
import { StatusPill } from "@/components/status-pill";
import { usePermission } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { productionApi } from "@/lib/api/production";
import {
  ORDER_STATUS_ES,
  PRODUCTION_STATION_ES,
  stationLabel,
} from "@/lib/api/sales-mappers";
import type {
  ApiOrderStatus,
  ApiProductionItem,
  ApiProductionStation,
} from "@/lib/api/types";
import { fmtDate, fmtInt } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";

/** Etapas del taller en orden de avance (los entregados no entran a la cola). */
const PIPELINE: ApiOrderStatus[] = [
  "in_design",
  "client_approval",
  "production",
  "with_supplier",
  "ready_for_delivery",
];

const STATIONS = Object.keys(PRODUCTION_STATION_ES) as ApiProductionStation[];
type StationFilter = ApiProductionStation | "all" | "unassigned";
const PAGE_SIZE = 50;

export default function ProductionPage() {
  const toast = useToast();
  const canAdvance = usePermission("sales.production.advance");
  const canAssign = usePermission("sales.production.assign");
  const [items, setItems] = useState<ApiProductionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stationFilter, setStationFilter] = useState<StationFilter>("all");
  const [overdue, setOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [itemBusy, setItemBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await productionApi.queue({
        station: stationFilter === "all" ? undefined : stationFilter,
        overdue: overdue || undefined,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setLoadError("No se pudo cargar la cola de producción.");
    } finally {
      setLoading(false);
    }
  }, [stationFilter, overdue, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /** Cambia un filtro y vuelve a la primera página. */
  const applyStation = (key: StationFilter) => {
    setPage(0);
    setStationFilter(key);
  };
  const toggleOverdue = () => {
    setPage(0);
    setOverdue((v) => !v);
  };

  const advance = async (item: ApiProductionItem, status: ApiOrderStatus) => {
    if (status === item.status) return;
    setItemBusy(item.itemId);
    setActionError(null);
    try {
      await ordersApi.transitionItemStatus(item.orderId, item.itemId, status);
      toast.success(`Job avanzado a "${ORDER_STATUS_ES[status]}"`);
      await load();
    } catch (err) {
      // El backend rechaza retrocesos con un error crudo en inglés
      // ("Invalid status transition: …"); tradúcelo para el taller.
      let msg = "No se pudo avanzar el job.";
      if (err instanceof ApiError) {
        msg = /invalid status transition/i.test(err.message)
          ? "No se puede avanzar el job a esa etapa."
          : err.message;
      }
      setActionError(msg);
    } finally {
      setItemBusy(null);
    }
  };

  const assign = async (
    item: ApiProductionItem,
    station: ApiProductionStation | null,
  ) => {
    if (station === item.station) return;
    setItemBusy(item.itemId);
    setActionError(null);
    try {
      await productionApi.assignStation(item.orderId, item.itemId, station);
      toast.success(
        station
          ? `Estación asignada: ${PRODUCTION_STATION_ES[station]}`
          : "Estación retirada del job",
      );
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "No se pudo asignar la estación.",
      );
    } finally {
      setItemBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = stationFilter !== "all" || overdue;

  return (
    <>
      <PageHeader
        title="Producción"
        sub={
          loading
            ? "Cargando…"
            : `${fmtInt(total)} job${total === 1 ? "" : "s"} en cola${hasFilter ? " (filtrado)" : ""}`
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

      <div
        className="flex flex-wrap items-center gap-1.5 mb-3"
        role="group"
        aria-label="Filtrar la cola"
      >
        {(
          [
            ["all", "Todas"],
            ["unassigned", "Sin asignar"],
            ...STATIONS.map(
              (s) => [s, PRODUCTION_STATION_ES[s]] as [StationFilter, string],
            ),
          ] as [StationFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn btn--sm ${stationFilter === key ? "btn--primary" : ""}`}
            onClick={() => applyStation(key)}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 text-muted">|</span>
        <button
          type="button"
          className={`btn btn--sm ${overdue ? "btn--primary" : ""}`}
          aria-pressed={overdue}
          onClick={toggleOverdue}
        >
          {I.clock} Vencidos
        </button>
      </div>

      {loading ? (
        <div className="card">
          <div className="card__body">
            <SkeletonTable rows={6} cols={7} />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card__body text-muted">
            {hasFilter
              ? "Ningún job coincide con el filtro."
              : "No hay jobs en producción. Las ventas nuevas aparecerán aquí."}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {PIPELINE.map((stage, stageIndex) => {
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
                        <th>Estación</th>
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
                          <td>
                            {canAssign ? (
                              <select
                                className="select"
                                style={{ fontSize: 12, padding: "2px 6px" }}
                                value={item.station ?? ""}
                                disabled={itemBusy !== null}
                                onChange={(e) =>
                                  void assign(
                                    item,
                                    (e.target.value ||
                                      null) as ApiProductionStation | null,
                                  )
                                }
                                aria-label={`Estación de ${item.productName} del pedido ${item.orderFolio}`}
                              >
                                <option value="">Sin asignar</option>
                                {STATIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {PRODUCTION_STATION_ES[s]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="tag text-[11px]">
                                {stationLabel(item.station)}
                              </span>
                            )}
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
                                {/* Solo etapas hacia adelante: el backend
                                    rechaza retroceder. El taller avanza hasta
                                    "listo para entrega"; marcar Entregado es
                                    gestión de la orden (desde el pedido). */}
                                {PIPELINE.slice(stageIndex).map((s) => (
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

      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            className="btn btn--sm"
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </button>
          <span className="text-muted text-xs">
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="btn btn--sm"
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderBoardCard } from "@/components/order-board-card";
import { PageHeader } from "@/components/page-header";
import { ordersApi } from "@/lib/api/orders";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type { ApiOrder, ApiOrderStatus } from "@/lib/api/types";
import { fmtInt } from "@/lib/format";

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

export default function BoardPage() {
  const [columns, setColumns] = useState<Record<string, ColumnState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        COLUMNS.map((status) =>
          ordersApi.list({
            status,
            take: PER_COLUMN,
            mine: mine || undefined,
            priority: urgentOnly ? "urgent" : undefined,
          }),
        ),
      );
      const next: Record<string, ColumnState> = {};
      COLUMNS.forEach((status, i) => {
        next[status] = { items: results[i].items, total: results[i].total };
      });
      setColumns(next);
    } catch {
      setError("No se pudo cargar el tablero.");
    } finally {
      setLoading(false);
    }
  }, [mine, urgentOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
          onClick={() => setMine((v) => !v)}
        >
          Mis pedidos
        </button>
        <button
          type="button"
          className={`btn btn--sm ${urgentOnly ? "btn--primary" : ""}`}
          aria-pressed={urgentOnly}
          onClick={() => setUrgentOnly((v) => !v)}
        >
          Solo urgentes
        </button>
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

      <div className="overflow-x-auto">
        <div className="flex gap-3" style={{ minWidth: "min-content" }}>
          {COLUMNS.map((status) => {
            const col = columns[status];
            const items = col?.items ?? [];
            const total = col?.total ?? 0;
            return (
              <div
                key={status}
                style={{ width: 240, flex: "0 0 240px" }}
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
                  <span className="font-medium text-sm">
                    {ORDER_STATUS_ES[status]}
                  </span>
                  <div className="spacer" />
                  <span className="text-muted text-xs">{fmtInt(total)}</span>
                </div>

                {loading ? (
                  <div className="text-muted text-xs" style={{ padding: 8 }}>
                    Cargando…
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-muted text-xs" style={{ padding: 8 }}>
                    —
                  </div>
                ) : (
                  items.map((o) => <OrderBoardCard key={o.id} order={o} />)
                )}

                {!loading && total > items.length && (
                  <div className="text-muted text-[11px]" style={{ padding: 8 }}>
                    +{total - items.length} más
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

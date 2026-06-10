"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PaymentPill } from "@/components/payment-pill";
import { StatusPill } from "@/components/status-pill";
import { usePermission } from "@/lib/auth/auth-context";
import { ordersApi } from "@/lib/api/orders";
import { ORDER_STATUS_ES, paymentLabel } from "@/lib/api/sales-mappers";
import type { ApiOrder, ApiOrderStatus } from "@/lib/api/types";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";
import { useApiList } from "@/lib/hooks/use-api-list";

const PAGE_SIZE = 25;

type Tab =
  | "Todos"
  | "Diseño"
  | "Aprobación"
  | "Producción"
  | "Con proveedor"
  | "Listos"
  | "Entregados";

const TABS: Tab[] = [
  "Todos",
  "Diseño",
  "Aprobación",
  "Producción",
  "Con proveedor",
  "Listos",
  "Entregados",
];

/** Las canceladas no tienen tab propia: se ven en "Todos" con su pill. */
const TAB_TO_STATUS: Record<Tab, ApiOrderStatus | null> = {
  Todos: null,
  Diseño: "in_design",
  Aprobación: "client_approval",
  Producción: "production",
  "Con proveedor": "with_supplier",
  Listos: "ready_for_delivery",
  Entregados: "delivered",
};

export default function OrdersPage() {
  const router = useRouter();
  const canSell = usePermission("sales.pos.sell");
  const [tab, setTab] = useState<Tab>("Todos");
  const [query, setQuery] = useState("");

  const {
    items: orders,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error: loadError,
    debounced,
    reload,
  } = useApiList<ApiOrder>({
    fetcher: (params) =>
      ordersApi.list({ ...params, status: TAB_TO_STATUS[tab] ?? undefined }),
    filterKey: tab,
    search: query,
    pageSize: PAGE_SIZE,
    errorMessage: "No se pudieron cargar los pedidos.",
  });

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Pedidos"
        sub={
          tab === "Todos"
            ? `${fmtInt(total)} pedidos`
            : `${fmtInt(total)} pedidos · ${tab}`
        }
        actions={
          <>
            <button className="btn">{I.download} Exportar</button>
            {canSell && (
              <Link className="btn btn--accent" href="/pos">
                {I.plus} Nueva venta
              </Link>
            )}
          </>
        }
      />

      {loadError && (
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
          <span className="flex-1">{loadError}</span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => void reload()}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="card">
        <div className="card__head" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
              onClick={() => changeTab(t)}
            >
              {t}
            </button>
          ))}
          <div className="spacer" />
          <div className="topbar__search" style={{ margin: 0, width: 240 }}>
            {I.search}
            <input
              placeholder="Buscar pedido o cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="icon-btn" aria-label="Filtros">{I.filter}</button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th style={{ textAlign: "right" }}>Items</th>
              <th>Pago</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th>Estatus</th>
              <th>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-muted">Cargando pedidos…</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  {debounced
                    ? `Sin pedidos para “${debounced}”.`
                    : "Sin pedidos."}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} onClick={() => router.push(`/orders/${o.folio}`)}>
                  <td className="num">{o.folio}</td>
                  <td>{o.clientName}</td>
                  <td className="num" style={{ textAlign: "right" }}>{o.itemsCount}</td>
                  <td><PaymentPill method={paymentLabel(o)} /></td>
                  <td className="num" style={{ textAlign: "right" }}>{fmtMXN(o.total)}</td>
                  <td><StatusPill s={ORDER_STATUS_ES[o.status]} /></td>
                  <td className="num">{o.deliverAt ? fmtDate(o.deliverAt) : "Sin fecha"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div
          className="flex items-center gap-3 text-xs text-muted"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <span>
            {total === 0
              ? "Sin pedidos"
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total,
                )} de ${total}`}
          </span>
          <div className="spacer" />
          <span className="num">
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            aria-label="Página anterior"
          >
            {I.chevronLeft}
          </button>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            aria-label="Página siguiente"
          >
            {I.chevronRight}
          </button>
        </div>
      </div>
    </>
  );
}
